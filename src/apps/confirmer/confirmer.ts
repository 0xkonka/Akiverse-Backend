import { setTimeout } from "timers/promises";
import {
  Block,
  BlockState,
  CurrencyType,
  DepositState,
  NftState,
  Prisma,
  TransferState,
  WithdrawalState,
} from "@prisma/client";
import { BlockCache, updateItemOwner } from "../../helpers/blockchain";
import prisma from "../../prisma";
import {
  AKIVERSE_LOCKER_ADDRESS,
  BLOCKS_TO_CONFIRM,
  USDC_WALLET_ADDRESS,
} from "../../constants";
import { isWalletAddressEqual, groupBy, serialFilter } from "../../utils";
import { error, info, warn } from "../../utils";
import { updateDepositState } from "../../helpers/deposit";
import { updateWithdrawalState } from "../../helpers/withdraw";

type ConfirmerState = "RUNNING" | "STOPPING" | "STOPPED" | "ERROR";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function confirmBlocks() {
  const cache = new BlockCache();
  const pendingBlocks = await prisma.block.findMany({
    where: { state: BlockState.PENDING },
    orderBy: { number: "desc" },
    take: 1000,
  });
  const generations: Block[][] = groupBy(
    pendingBlocks,
    (block) => block.number,
  );
  const hashesToConfirm: Set<string> = new Set();

  async function shouldConfirm(
    block: Block,
    depthNeeded: number = BLOCKS_TO_CONFIRM,
  ): Promise<boolean> {
    // shallow check
    if (depthNeeded <= 0) return true;
    const children = await cache.getChildren(block);
    if (
      children.some(
        (child) =>
          child.state === BlockState.CONFIRMED ||
          hashesToConfirm.has(child.hash),
      )
    ) {
      return true;
    }
    // recursive check
    for (const child of children) {
      const shouldConfirmChild = await shouldConfirm(child, depthNeeded - 1);
      if (shouldConfirmChild) return true;
    }
    return false;
  }

  // Decide which blocks to confirm
  for (const generation of generations) {
    const confirmable = await serialFilter(shouldConfirm, generation);
    if (confirmable.length > 1) {
      throw new Error("Blockchain got owned.");
    }
    if (confirmable.length === 1) {
      const confirmHash = confirmable[0].hash;
      hashesToConfirm.add(confirmHash);
    }
  }

  const toConfirmArray = Array.from(hashesToConfirm);
  info({ msg: "Confirming Blocks", toConfirmArray });

  // Confirm blocks
  await prisma.block.updateMany({
    where: { hash: { in: toConfirmArray } },
    data: { state: BlockState.CONFIRMED },
  });
}

async function invalidateBlocks() {
  const cache = new BlockCache();
  const pendingBlocks = await prisma.block.findMany({
    where: { state: BlockState.PENDING },
    orderBy: { number: "asc" },
    take: 1000,
  });
  const hashesToInvalidate: Set<string> = new Set();

  async function shouldInvalidate(block: Block): Promise<boolean> {
    // Check for invalidated parent
    if (hashesToInvalidate.has(block.parentHash)) return true;
    const parent = await cache.getParent(block);
    if (parent?.state === BlockState.INVALIDATED) return true;
    // Check for confirmed sibling
    const others = await cache.getGeneration(block.number);
    for (const other of others) {
      if (other.hash !== block.hash && other.state === BlockState.CONFIRMED) {
        return true;
      }
    }
    // Done
    return false;
  }

  // Decide which blocks to invalidate
  for (const block of pendingBlocks) {
    if (await shouldInvalidate(block)) {
      hashesToInvalidate.add(block.hash);
    }
  }

  const toInvalidateArray = Array.from(hashesToInvalidate);
  info({ msg: "Invalidating Blocks", toInvalidateArray });

  // Confirm blocks
  await prisma.block.updateMany({
    where: { hash: { in: toInvalidateArray } },
    data: { state: BlockState.INVALIDATED },
  });
}

export async function checkBlocks() {
  // これは、block.stateを更新する唯一の関数である。
  await confirmBlocks();
  await invalidateBlocks();
}

type SimpleTransfer = {
  from: string;
  to: string;
};

// 同NFTの複数のtransferがあれば、通り道のグラフから最終の行き先を調べる
// ループの場合はnullを返却。
export function getLastAddress(transfers: SimpleTransfer[]): string | null {
  return getEndpoint(transfers, 1);
}

// 同NFTの複数のtransferがあれば、通り道のグラフから最初の送り元を調べる
// ループの場合はnullを返却。
export function getFirstAddress(transfers: SimpleTransfer[]): string | null {
  return getEndpoint(transfers, -1);
}

type Endpoint = -1 | 1; // 最初・最後

function getEndpoint(
  transfers: SimpleTransfer[],
  endpoint: Endpoint,
): string | null {
  const toMinusFrom: Map<string, number> = new Map();
  // 上記のMapに各アドレスにNFTが入る回数マイナス出る回数を計算する
  // 下記のコピーは不要ですが、transfersを直接回るとTypeErrorが出てます
  // fooとtransfersは同じタイプなのでローカルのtsがバグってる？？？
  const foo = Array.from(transfers);
  for (const transfer of foo) {
    const { from, to } = transfer;
    toMinusFrom.set(to, (toMinusFrom.get(to) || 0) + 1);
    toMinusFrom.set(from, (toMinusFrom.get(from) || 0) - 1);
  }
  // 基本的に、入る回数が出る回数を超えるウォレットは最後になるが、
  // 例外を除きます。
  // まずありえない場合にエラーを投げる。
  const entries = Array.from(toMinusFrom.entries());
  for (const entry of entries) {
    if (entry[1] > 1 || entry[1] < -1) {
      throw new Error("Invalid transfer path.");
    }
  }
  // 出口を見つける
  const endpoints = entries.filter((x) => x[1] === endpoint);
  // 複数の出口はありえない
  if (endpoints.length > 1) {
    throw new Error("Invalid transfer path.");
  }
  // ループの場合
  if (endpoints.length === 0) {
    return null;
  }
  // 出口が一つの場合
  return endpoints[0][0];
}

export class Confirmer {
  state: ConfirmerState;
  timeout: number;
  akiverseLockerAddress: string;
  usdcWalletAddress: string;
  constructor(
    timeout: number,
    akiverseLockerAddress: string,
    usdcWalletAddress: string,
  ) {
    this.state = "STOPPED";
    this.timeout = timeout;
    this.akiverseLockerAddress = akiverseLockerAddress;
    this.usdcWalletAddress = usdcWalletAddress;
  }

  async start() {
    this.state = "RUNNING";

    try {
      // eslint-disable-next-line no-constant-condition
      while (this.state == "RUNNING") {
        info({ msg: "checking blocks" });
        await checkBlocks();
        info({ msg: "checking transfers" });
        await this.checkTransfers();
        await this.checkCurrencyTransfers();
        await setTimeout(this.timeout);
      }
      this.state = "STOPPED";
    } catch (e) {
      this.state = "ERROR";
      error({
        err: JSON.stringify(e, Object.getOwnPropertyNames(e)),
        msg: "confirmer failed",
      });
    }
  }
  async stop(): Promise<ConfirmerState> {
    this.state = "STOPPING";
    while (this.state == "STOPPING") {
      await setTimeout(100);
    }
    return this.state;
  }

  getDepositor(transfers: SimpleTransfer[]): string {
    const transfersToLocker = transfers.filter(
      ({ to }) => to === this.akiverseLockerAddress,
    );
    if (transfersToLocker.length !== 1) {
      throw new Error("Invalid deposit.");
    }
    return transfersToLocker[0].from;
  }

  async checkTransfers() {
    // これは、transfer.stateを更新する唯一の関数である。
    const rows: any[] = await prisma.$queryRaw`
      select
        t.id,
        t.block_number as "blockNumber",
        t.transaction_index as "transactionIndex",
        t.nft_type as "nftType",
        t.from,
        t.to,
        t.token_id as "tokenId",
        t.state,
        b.state as "finalState",
        t.transaction_hash as "transactionHash"
      from transfers as t inner join blocks as b
      on t.block_hash = b.hash
      where t.state = 'PENDING' and b.state != 'PENDING'
      order by t.block_number, t.transaction_index, t.nft_type, t.token_id;
    `;
    // transaction, トークンごとに纏める
    const groups = groupBy(rows, (row) =>
      [row.blockHash, row.transactionIndex, row.nftType, row.tokenId].join(","),
    );
    for (const rowGroup of groups) {
      const to = getLastAddress(rowGroup);
      const from = getFirstAddress(rowGroup);
      // toがnullの場合はtransferのループなので、保有者が変わらない。
      if (to !== null) {
        // groupByの効果により、全行の下記のカラムは同じ
        const {
          finalState,
          nftType,
          tokenId,
          blockNumber, // blockHashで決まっている
          transactionHash,
          transactionIndex,
        } = rowGroup[0];
        if (finalState === "CONFIRMED") {
          const isDeposit = isWalletAddressEqual(
            to,
            this.akiverseLockerAddress,
          );
          const isWithdrawal = isWalletAddressEqual(
            from,
            this.akiverseLockerAddress,
          );
          const nftState = isDeposit
            ? NftState.IN_AKIVERSE
            : NftState.IN_WALLET;
          const ownerWalletAddress = isDeposit
            ? this.getDepositor(rowGroup)
            : to;
          const didUpdate = await updateItemOwner(
            nftType,
            tokenId as string,
            ownerWalletAddress,
            to,
            nftState,
            blockNumber,
            transactionIndex,
          );
          if (!didUpdate) {
            warn({ msg: `Unrecognized ${nftType} with id ${tokenId}!` });
            continue;
          }
          if (isDeposit) {
            await updateDepositState(
              nftType,
              tokenId,
              finalState,
              transactionHash,
              blockNumber,
              transactionIndex,
            );
          } else if (isWithdrawal) {
            await updateWithdrawalState(
              nftType,
              tokenId,
              finalState,
              transactionHash,
              blockNumber,
              transactionIndex,
            );
          }
        }
      }
      await prisma.transfer.updateMany({
        where: { id: { in: rowGroup.map((row: any) => row.id) } },
        data: { state: rowGroup[0].finalState },
      });
    }
  }

  async checkCurrencyTransfers() {
    // これは、currencyTransfer.stateを更新する唯一の関数である。
    const rows: any[] = await prisma.$queryRaw`
      select
        t.id,
        t.block_number as "blockNumber",
        t.transaction_index as "transactionIndex",
        t.currency_type as "currencyType",
        t.from,
        t.to,
        t.amount as "amount",
        t.state,
        b.state as "finalState",
        t.transaction_hash as "transactionHash"
      from currency_transfers as t inner join blocks as b
      on t.block_hash = b.hash
      where t.state = 'PENDING' and b.state != 'PENDING'
      order by t.block_number, t.transaction_index, t.currency_type, t.amount;
    `;
    for (const currencyTransfer of rows) {
      const {
        id,
        finalState,
        currencyType,
        amount,
        from,
        to,
        transactionHash,
      } = currencyTransfer;
      const queries = [];
      if (finalState === "CONFIRMED") {
        if (currencyType === "AKIR") {
          if (isWalletAddressEqual(to, ZERO_ADDRESS)) {
            // deposit
            const currencyDeposit = await prisma.currencyDeposit.findFirst({
              where: {
                hash: transactionHash,
                walletAddress: from,
                currencyType: CurrencyType.AKIR,
                state: {
                  in: [DepositState.PENDING, DepositState.UNPROCESSED],
                },
              },
            });
            if (!currencyDeposit) {
              warn({
                msg: "Transaction not found in currency deposit(AKIR)",
                hash: transactionHash,
              });
            } else {
              queries.push(
                prisma.currencyDeposit.updateMany({
                  where: {
                    hash: transactionHash,
                    walletAddress: from,
                    currencyType: CurrencyType.AKIR,
                    state: {
                      in: [DepositState.PENDING, DepositState.UNPROCESSED],
                    },
                  },
                  data: { state: DepositState.CONFIRMED },
                }),
              );
            }
            queries.push(
              prisma.user.update({
                where: { walletAddress: from },
                data: { akirBalance: { increment: amount } },
              }),
            );
          } else if (isWalletAddressEqual(from, ZERO_ADDRESS)) {
            // withdrawal
            queries.push(
              prisma.currencyWithdrawal.updateMany({
                where: { hash: transactionHash },
                data: { state: WithdrawalState.CONFIRMED },
              }),
            );
          }
        } else if (currencyType === "AKV") {
          if (isWalletAddressEqual(to, this.akiverseLockerAddress)) {
            // deposit
            const currencyDeposit = await prisma.currencyDeposit.findFirst({
              where: {
                hash: transactionHash,
                walletAddress: from,
                currencyType: CurrencyType.AKV,
                state: {
                  in: [DepositState.PENDING, DepositState.UNPROCESSED],
                },
              },
            });
            if (!currencyDeposit) {
              warn({
                msg: "Transaction not found in currency deposit(AKV)",
                hash: transactionHash,
              });
            } else {
              queries.push(
                prisma.currencyDeposit.updateMany({
                  where: {
                    hash: transactionHash,
                    walletAddress: from,
                    currencyType: CurrencyType.AKV,
                    state: {
                      in: [DepositState.PENDING, DepositState.UNPROCESSED],
                    },
                  },
                  data: { state: DepositState.CONFIRMED },
                }),
              );
            }
            queries.push(
              prisma.user.update({
                where: { walletAddress: from },
                data: { akvBalance: { increment: amount } },
              }),
            );
          } else if (isWalletAddressEqual(from, this.akiverseLockerAddress)) {
            // withdrawal
            queries.push(
              prisma.currencyWithdrawal.updateMany({
                where: { hash: transactionHash },
                data: { state: WithdrawalState.CONFIRMED },
              }),
            );
          }
        } else if (currencyType === CurrencyType.USDC) {
          // USDCを受け取る処理はないので未実装
          if (isWalletAddressEqual(from, this.usdcWalletAddress)) {
            // LockerからのWithdraw(送金)
            queries.push(
              prisma.currencyWithdrawal.updateMany({
                where: { hash: transactionHash },
                data: { state: WithdrawalState.CONFIRMED },
              }),
            );
          }
        }
      }
      queries.push(
        prisma.currencyTransfer.update({
          where: { id },
          data: { state: finalState },
        }),
      );
      try {
        await prisma.$transaction(queries);
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
          if (e.code === "P2025") {
            // userが見つからなかった
            info({ msg: "Transfer to unregistered wallet address" });
            await prisma.currencyTransfer.update({
              where: { id },
              data: { state: TransferState.FROZEN },
            });
          }
        }
      }
    }
  }
}

export async function main() {
  const confirmer = new Confirmer(
    1000,
    AKIVERSE_LOCKER_ADDRESS,
    USDC_WALLET_ADDRESS,
  );
  confirmer.start();
}

if (require.main === module) {
  main();
}
