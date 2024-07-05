import { Block, NftState, NftType } from "@prisma/client";
import { BigNumber, providers } from "ethers";
import { compareArrays, info, isWalletAddressEqual } from "../utils";
import prisma from "../prisma";
import { ALCHEMY_API_KEY, JSON_RPC_PROVIDER } from "../constants";
import { Provider } from "@ethersproject/abstract-provider";
import {
  notifyAmDeposit,
  notifyAmWithdraw,
  notifyApDeposit,
  notifyApWithdraw,
  notifyGcDeposit,
  notifyGcWithdraw,
} from "./event_notification";

export function getProvider(): providers.BaseProvider {
  if (ALCHEMY_API_KEY) {
    const env = process.env.ENV;
    const chain = env === "production" ? "matic" : "maticmum";
    info({ msg: "getProvider", provider: "Alchemy", chain });
    return new providers.AlchemyProvider(chain, ALCHEMY_API_KEY);
  }
  if (JSON_RPC_PROVIDER) {
    info({ msg: "getProvider", provider: "JsonRpc", url: JSON_RPC_PROVIDER });
    return new providers.JsonRpcProvider(JSON_RPC_PROVIDER);
  }

  throw new Error("Cannot instantiate provider.");
}

function getDao(nftType: NftType): any {
  if (nftType == NftType.ARCADE_MACHINE) return prisma.arcadeMachine;
  if (nftType == NftType.GAME_CENTER) return prisma.gameCenter;
  if (nftType == NftType.ARCADE_PART) return prisma.arcadePart;
  return undefined;
}

async function notify(
  nftType: NftType,
  nftState: NftState,
  tokenId: string,
): Promise<void> {
  if (nftState === NftState.IN_WALLET) {
    if (nftType == NftType.ARCADE_MACHINE)
      return await notifyAmWithdraw(tokenId);
    if (nftType == NftType.GAME_CENTER) return await notifyGcWithdraw(tokenId);
    if (nftType == NftType.ARCADE_PART) return await notifyApWithdraw(tokenId);
  } else if (nftState === NftState.IN_AKIVERSE) {
    if (nftType == NftType.ARCADE_MACHINE)
      return await notifyAmDeposit(tokenId);
    if (nftType == NftType.GAME_CENTER) return await notifyGcDeposit(tokenId);
    if (nftType == NftType.ARCADE_PART) return await notifyApDeposit(tokenId);
  }

  return;
}

const DENOMINATOR = 1e6;
const DENOMINATOR_BIGNUM = BigNumber.from(DENOMINATOR);
export function getGasPriceFunc(
  provider: Provider,
  gasPriceAdjustmentRatio: number,
): () => Promise<BigNumber> {
  const RATIO_NUMERATOR = BigNumber.from(
    Math.round(gasPriceAdjustmentRatio * DENOMINATOR),
  );
  return async () => {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(RATIO_NUMERATOR).div(DENOMINATOR_BIGNUM);
  };
}

async function updateItemIfExists(
  nftType: NftType,
  tokenId: string,
  ownerWalletAddress: string,
  physicalWalletAddress: string,
  nftState: NftState,
  blockNumber: number,
  transactionIndex: number,
): Promise<boolean> {
  const dao = getDao(nftType);
  const item = await dao.findUnique({ where: { id: tokenId } });
  if (item === null) {
    return false;
  }
  // アイテムは既に保存されているので、更新する稼働かを決める
  // 引数の情報と既存の情報の順序を計算する
  const comparison = compareArrays(
    [item.lastBlock, item.lastTransactionIndex],
    [blockNumber, transactionIndex],
  );
  // 引数の方が新しい；既存アイテムを更新する
  if (comparison < 0) {
    // ユーザーを探す
    const user = await prisma.user.findUnique({
      where: { walletAddress: ownerWalletAddress },
      select: { id: true },
    });
    const userId: string | null = user?.id || null;
    await dao.update({
      where: { id: tokenId },
      data: {
        userId,
        ownerWalletAddress,
        physicalWalletAddress,
        state: nftState,
        lastBlock: blockNumber,
        lastTransactionIndex: transactionIndex,
      },
    });
    // 通知する
    await notify(nftType, nftState, tokenId);
    return true;
  }
  // 全く同時の情報：内容が一致するはず
  if (comparison === 0) {
    if (
      !isWalletAddressEqual(ownerWalletAddress, item.ownerWalletAddress) ||
      nftState !== item.state
    ) {
      throw new Error(
        "同時に同トークンが複数の送り先にtransferされてあり得ない",
      );
    }
  }
  // 既存の情報の方が新しい：何もしない
  return true;
}

export function updateItemOwner(
  nftType: NftType,
  tokenId: string,
  ownerWalletAddress: string,
  physicalWalletAddress: string,
  nftState: NftState,
  blockNumber: number,
  transactionIndex: number,
): Promise<boolean> {
  return updateItemIfExists(
    nftType,
    tokenId,
    ownerWalletAddress,
    physicalWalletAddress,
    nftState,
    blockNumber,
    transactionIndex,
  );
}

export class BlockCache {
  hashBlocks: Map<string, Block>;
  numberHashBlocks: Map<number, Map<string, Block>>;

  constructor() {
    this.numberHashBlocks = new Map<number, Map<string, Block>>();
    this.hashBlocks = new Map<string, Block>();
  }

  reset() {
    this.numberHashBlocks = new Map<number, Map<string, Block>>();
    this.hashBlocks = new Map<string, Block>();
  }

  async loadBlocks(start: number, end: number) {
    const blocks = await prisma.block.findMany({
      where: { number: { gte: start, lt: end } },
    });
    for (const block of blocks) {
      const { number, hash } = block;
      if (!this.numberHashBlocks.has(number)) {
        this.numberHashBlocks.set(number, new Map<string, Block>());
      }
      this.numberHashBlocks.get(number)!.set(hash, block);
      this.hashBlocks.set(hash, block);
    }
  }

  async getBlock(number: number, hash: string): Promise<Block | null> {
    if (!this.hashBlocks.has(hash)) {
      await this.loadBlocks(number - 50, number + 50);
    }
    return this.hashBlocks.get(hash) || null;
  }

  getParent(block: Block): Promise<Block | null> {
    return this.getBlock(block.number - 1, block.parentHash);
  }

  async getGeneration(blockNumber: number): Promise<Block[]> {
    if (!this.numberHashBlocks.has(blockNumber)) {
      await this.loadBlocks(blockNumber - 50, blockNumber + 50);
    }
    const generation = this.numberHashBlocks.get(blockNumber);
    if (generation) {
      return Array.from(generation.values());
    }
    return [];
  }

  async getChildren(block: Block): Promise<Block[]> {
    const { hash, number } = block;
    const childGeneration = await this.getGeneration(number + 1);
    return childGeneration.filter((b) => b.parentHash === hash);
  }
}

export let lastMissingFirstNumber: number;
// 見落としたブロックを調べる
export async function findMissingBlockNumbers(): Promise<number[]> {
  // 最新のブロック数を調べる
  const latestBlock = await prisma.block.findFirst({
    orderBy: { number: "desc" },
    select: { number: true },
  });
  if (!latestBlock) {
    return [];
  }
  // 最古のブロック数を調べる
  const firstBlock = await prisma.block.findFirstOrThrow({
    orderBy: { number: "asc" },
    select: { number: true },
  });
  // 記録されていないブロック数を調べる
  const missingNumbers: Set<number> = new Set();

  const missingFirstNumber = lastMissingFirstNumber
    ? lastMissingFirstNumber
    : firstBlock.number;
  const missingNumbersResult: { i: BigInt }[] = await prisma.$queryRaw`
    select i
    from generate_series(${missingFirstNumber}, ${latestBlock.number}, 1) i
    left join blocks
    on i = number
    where number is null
    order by i
    limit 1000;
  `;
  if (missingNumbersResult.length > 0) {
    // 欠損ブロックが存在した場合、次回は最小のnumberから調べる
    lastMissingFirstNumber = Number(missingNumbersResult[0].i);
  } else {
    // 欠損ブロックが存在しなかった場合、全てのブロックが存在しているので、次回は今回の最新ブロックから調べる
    lastMissingFirstNumber = Number(latestBlock.number);
  }
  for (const entry of missingNumbersResult) {
    missingNumbers.add(Number(entry.i));
  }

  // 配列を返却
  const missingNumbersArray = Array.from(missingNumbers);
  missingNumbersArray.sort();
  return missingNumbersArray;
}

export async function findMissingBlockHashes(): Promise<string[]> {
  const missingBlockHashes: Set<string> = new Set();
  // 記録されていない親ブロックを調べる
  // （同ブロック数の兄弟ブロックが記録されている可能性があります）
  const orphanBlocksResult: { parent_hash: string }[] = await prisma.$queryRaw`
    select parent_hash, number
    from blocks
    where parent_hash not in (
      select hash from blocks
    )
    and state = 'CONFIRMED'
    and number in (
        select number + 1 
        from blocks 
        where state = 'PENDING'
    )
    limit 1000;
  `;
  for (const entry of orphanBlocksResult) {
    missingBlockHashes.add(entry.parent_hash);
  }
  return Array.from(missingBlockHashes);
}
