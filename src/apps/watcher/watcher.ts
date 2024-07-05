import { setTimeout } from "timers/promises";
import { BigNumber, providers, utils } from "ethers";
import { Block, BlockScanState, CurrencyType, NftType } from "@prisma/client";
import prisma from "../../prisma";
import { Prisma } from "@prisma/client";
import {
  BC_POLLING_INTERVAL_MS,
  FT_ADDRESSES,
  NFT_ADDRESSES,
  USDC_WALLET_ADDRESS,
} from "../../constants";
import { error, info, warn } from "../../utils";
import {
  findMissingBlockHashes,
  findMissingBlockNumbers,
} from "../../helpers/blockchain";
import pLimit from "p-limit";
import { getProvider } from "../../helpers/blockchain";
import { promiseLimit } from "@node-libraries/promise-limit";
import { hexZeroPad } from "ethers/lib/utils";

// https://docs.alchemy.com/reference/eth-getlogs
// 2000までいけそう
const MISSED_BLOCK_SEARCH_WINDOW_LOWER = 50;
const MISSED_BLOCK_SEARCH_WINDOW_UPPER = 500;
const SCANNED_BLOCK_SPACING = 40;

type WatcherState = "RUNNING" | "STOPPING" | "STOPPED";

async function lookupAndSaveBlock(
  provider: providers.BaseProvider,
  scanState: BlockScanState,
  target: number | string,
): Promise<Block> {
  info({ msg: "lookupAndSaveBlock", target });
  const now = Date.now() / 1000;
  const block = await provider.getBlock(target);
  const { number, hash, parentHash } = block;
  const result = await prisma.block.create({
    data: { number: number, hash, parentHash, scanState },
  });
  info({
    msg: "Block created.",
    number,
    hash,
    parentHash,
    scanState,
    secondsOld: now - block.timestamp,
  });
  return result;
}

// 見落としたブロックを拾う
async function getMissingBlocks(
  provider: providers.BaseProvider,
): Promise<boolean> {
  info({ msg: "get missing blocks" });
  // 落としたブロック数を調べる
  const missingNumbers = await findMissingBlockNumbers();
  console.log({ missingNumbers });
  const missingHashes = await findMissingBlockHashes();
  console.log({ missingHashes });
  const mergedTargets = Array.from([...missingNumbers, ...missingHashes]);
  const ps = promiseLimit();
  // 拾う
  if (mergedTargets.length > 0) {
    for (const missingNumberOrHash of mergedTargets) {
      ps.add(
        lookupAndSaveBlock(
          provider,
          BlockScanState.MISSED,
          missingNumberOrHash,
        ),
      );
      try {
        await ps.wait(2);
      } catch (e) {
        warn({ e });
      }
    }

    try {
      await ps.all();
    } catch (e) {
      warn({ e });
    }
    return true;
  }
  return false;
}

class NftLogSaver {
  nftType: NftType;
  parser: utils.Interface;

  constructor(nftType: NftType) {
    this.nftType = nftType;
    this.parser = new utils.Interface([
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
    ]);
  }

  async saveLog(log: any) {
    const { blockHash, blockNumber, transactionIndex, transactionHash } = log;
    const parsedLog = this.parser.parseLog(log);
    const { from, to, tokenId } = parsedLog.args as any as {
      from: string;
      to: string;
      tokenId: BigNumber;
    };
    info({
      msg: `Transfer ${tokenId} from ${from} to ${to} in block ${blockNumber}`,
    });
    try {
      await prisma.transfer.create({
        data: {
          blockNumber,
          blockHash,
          transactionIndex,
          transactionHash,
          nftType: this.nftType,
          from,
          to,
          tokenId: tokenId.toString(),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          // transferは既に記録されてる
          info({ msg: "Duplicate transfer" });
          return;
        }
      }
      throw e;
    }
    info({ msg: "Transfer saved." });
  }
}

class CurrencyLogSaver {
  currencyType: CurrencyType;
  parser: utils.Interface;

  constructor(currencyType: CurrencyType) {
    this.currencyType = currencyType;
    this.parser = new utils.Interface([
      "event Transfer(address indexed from, address indexed to, uint256 amount)",
    ]);
  }

  async saveLog(log: any) {
    const { blockHash, blockNumber, transactionIndex, transactionHash } = log;
    const parsedLog = this.parser.parseLog(log);
    const { from, to, amount } = parsedLog.args as any as {
      from: string;
      to: string;
      amount: BigNumber;
    };
    info({
      msg: "currency transfer",
      amount,
      currencyType: this.currencyType,
      from,
      to,
      blockNumber,
    });
    try {
      await prisma.currencyTransfer.create({
        data: {
          blockNumber,
          blockHash,
          transactionIndex,
          transactionHash,
          currencyType: this.currencyType,
          from,
          to,
          amount: amount.toString(),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          // currencyTransferは既に記録されてる
          info({ msg: "Duplicate currencyTransfer" });
          return;
        }
      }
      throw e;
    }
    info({ msg: "CurrencyTransfer saved." });
  }
}

function watchBlocks(provider: providers.BaseProvider) {
  const limiter = pLimit(2);
  info({ msg: "watching blocks" });
  provider.on("block", (number: number) =>
    limiter(lookupAndSaveBlock, provider, BlockScanState.WATCHED, number),
  );
}

export class Watcher {
  provider: providers.BaseProvider;
  state: WatcherState;
  checkForMissingBlocksLoopPeriod: number;
  checkForMissingBlocksStartDelay: number;
  nftAddresses: Partial<Record<NftType, string>>;
  ftAddresses: Partial<Record<CurrencyType, string>>;
  constructor(
    checkForMissingBlocksLoopPeriod: number,
    checkForMissingBlocksStartDelay: number,
    nftAddresses: Partial<Record<NftType, string>>,
    ftAddresses: Partial<Record<CurrencyType, string>>,
  ) {
    this.provider = getProvider();
    this.state = "STOPPED";
    this.checkForMissingBlocksLoopPeriod = checkForMissingBlocksLoopPeriod;
    this.checkForMissingBlocksStartDelay = checkForMissingBlocksStartDelay;
    this.nftAddresses = nftAddresses;
    this.ftAddresses = ftAddresses;
  }

  async start() {
    this.state = "RUNNING";
    // FIXME Constants直読みしないようにしたい
    this.provider.pollingInterval = BC_POLLING_INTERVAL_MS;
    try {
      for (const nftType of Object.keys(this.nftAddresses) as NftType[]) {
        this.watchTransfers(nftType);
      }
      for (const currencyType of Object.keys(
        this.ftAddresses,
      ) as CurrencyType[]) {
        this.watchCurrencyTransfers(currencyType);
      }
      watchBlocks(this.provider);
      this.checkForMissingData();
    } catch (e) {
      error({
        err: JSON.stringify(e, Object.getOwnPropertyNames(e)),
        msg: "watchTransfers failed",
      });
    }
  }

  async stop() {
    this.state = "STOPPING";
    this.provider.removeAllListeners();

    while (this.state == "STOPPING") {
      await setTimeout(100);
    }
  }

  nftLogFilterAndSaver(nftType: NftType) {
    const address = this.nftAddresses[nftType];

    if (address === undefined || address[0] === "x") {
      throw new Error(`Missing contract address for ${nftType}!`);
    }
    const filter = {
      address,
      topics: [utils.id("Transfer(address,address,uint256)")],
    };
    const saver = new NftLogSaver(nftType);
    return { filter, saver };
  }

  currencyLogFilterAndSaver(currencyType: CurrencyType) {
    const address = this.ftAddresses[currencyType];

    if (address === undefined || address[0] === "x") {
      throw new Error(`Missing contract address for ${currencyType}!`);
    }
    if (currencyType === CurrencyType.USDC) {
      const filter = {
        address,
        topics: [
          utils.id("Transfer(address,address,uint256)"),
          hexZeroPad(USDC_WALLET_ADDRESS, 32),
        ],
      };
      const saver = new CurrencyLogSaver(currencyType);
      return { filter, saver };
    } else {
      const filter = {
        address,
        topics: [utils.id("Transfer(address,address,uint256)")],
      };
      const saver = new CurrencyLogSaver(currencyType);
      return { filter, saver };
    }
  }

  watchTransfers(nftType: NftType) {
    const { filter, saver } = this.nftLogFilterAndSaver(nftType);
    info({ msg: `Watching transfers for ${nftType} at ${filter.address}.` });
    this.provider.on(filter, async (log) => {
      await saver.saveLog(log);
    });
  }

  watchCurrencyTransfers(currencyType: CurrencyType) {
    const { filter, saver } = this.currencyLogFilterAndSaver(currencyType);
    info({
      msg: `Watching currency transfers for ${currencyType} at ${filter.address}.`,
    });
    this.provider.on(filter, async (log) => {
      await saver.saveLog(log);
    });
  }

  async getMissingTransfers() {
    // find missed blocks
    const block = await prisma.block.findFirst({
      where: { scanState: BlockScanState.MISSED },
    });
    if (!block) {
      info({ msg: "getMissingTransfers: No missed blocks." });
      return false;
    }
    const { number } = block;
    const fromBlock = number - MISSED_BLOCK_SEARCH_WINDOW_LOWER;
    const toBlock = number + MISSED_BLOCK_SEARCH_WINDOW_UPPER;
    // search blockchain logs
    for (const nftType of Object.keys(this.nftAddresses) as NftType[]) {
      info({ msg: `looking up missing transfers ${nftType}` });
      const { filter, saver } = this.nftLogFilterAndSaver(nftType);
      const logs = await this.provider.getLogs({
        ...filter,
        fromBlock,
        toBlock,
      });
      info(logs);
      for (const log of logs) {
        await saver.saveLog(log);
      }
    }
    for (const currencyType of Object.keys(
      this.ftAddresses,
    ) as CurrencyType[]) {
      info({ msg: `looking up missing currency transfers ${currencyType}` });
      const { filter, saver } = this.currencyLogFilterAndSaver(currencyType);
      const logs = await this.provider.getLogs({
        ...filter,
        fromBlock,
        toBlock,
      });
      info(logs);
      for (const log of logs) {
        await saver.saveLog(log);
      }
    }
    // update block scan state
    await prisma.block.updateMany({
      where: {
        number: {
          gte: number - SCANNED_BLOCK_SPACING,
          lte: number + SCANNED_BLOCK_SPACING,
        },
        scanState: BlockScanState.MISSED,
      },
      data: {
        scanState: BlockScanState.SCANNED,
      },
    });
    return true;
  }

  async checkForMissingData() {
    // 見落としたブロックの間隔を測るには最新ブロックが必要
    // なので、起動してから少し待つ
    await setTimeout(this.checkForMissingBlocksStartDelay);
    // eslint-disable-next-line no-constant-condition
    while (this.state == "RUNNING") {
      const foundBlocks = await getMissingBlocks(this.provider);
      const foundTransfers = await this.getMissingTransfers();
      info({ foundBlocks, foundTransfers });
      if (!foundBlocks && !foundTransfers) {
        // 見落としがなかった場合、すぐに見落としが現れないと想定していますので待機。
        // あった場合は、getMissingBlocksの頭のコメントの通り、全て拾われない可能性
        // があるので待機せずにループを繰り返す。
        await setTimeout(this.checkForMissingBlocksLoopPeriod);
      }
    }
    this.state = "STOPPED";
  }
}

function main() {
  const watcher = new Watcher(
    1 * 60 * 1000,
    20000,
    NFT_ADDRESSES,
    FT_ADDRESSES,
  );
  watcher.start();
}

if (require.main === module) {
  main();
}
