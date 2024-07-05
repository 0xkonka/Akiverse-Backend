import { ArcadePart, BlockState, NftState, NftType } from "@prisma/client";
import {
  findMissingBlockHashes,
  findMissingBlockNumbers,
  getGasPriceFunc,
  lastMissingFirstNumber,
  updateItemOwner,
} from "../../src/helpers/blockchain";
import { eraseDatabase, recordBlock } from "../test_helper";
import prisma from "../../src/prisma";
import { mock } from "jest-mock-extended";
import { Provider } from "@ethersproject/abstract-provider";
import { BigNumber, utils } from "ethers";

function fetchItem(tokenId: string): Promise<ArcadePart> {
  return prisma.arcadePart.findUniqueOrThrow({
    where: { id: tokenId },
  });
}

describe("updateItemOwner", () => {
  beforeEach(eraseDatabase);

  it("can update an item's owner", async () => {
    const tokenId = "101";
    await prisma.arcadePart.create({
      data: {
        id: tokenId,
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
      },
    });
    await updateItemOwner(
      NftType.ARCADE_PART,
      tokenId,
      "kirito",
      "kirito",
      NftState.IN_WALLET,
      1,
      0,
    );
    await updateItemOwner(
      NftType.ARCADE_PART,
      tokenId,
      "asuna",
      "asuna",
      NftState.IN_WALLET,
      2,
      0,
    );
    const result = await fetchItem(tokenId);
    // result should be the new item
    expect(result).toMatchObject({
      ownerWalletAddress: "asuna",
      id: tokenId,
      lastBlock: 2,
    });
  });

  it("can set an item's state", async () => {
    const tokenId = "101";
    await prisma.arcadePart.create({
      data: {
        id: tokenId,
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
      },
    });
    await updateItemOwner(
      NftType.ARCADE_PART,
      tokenId,
      "kirito",
      "kirito",
      NftState.IN_WALLET,
      1,
      0,
    );
    await updateItemOwner(
      NftType.ARCADE_PART,
      tokenId,
      "kirito",
      "kirito",
      NftState.IN_AKIVERSE,
      2,
      0,
    );
    const result = await fetchItem(tokenId);
    // result should be the new item
    expect(result).toMatchObject({
      ownerWalletAddress: "kirito",
      id: tokenId,
      lastBlock: 2,
      state: NftState.IN_AKIVERSE,
    });
  });

  it("won't update an item out of order", async () => {
    const tokenId = "101";
    await prisma.arcadePart.create({
      data: {
        id: tokenId,
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
      },
    });
    // two updates
    await updateItemOwner(
      NftType.ARCADE_PART,
      tokenId,
      "asuna",
      "asuna",
      NftState.IN_WALLET,
      2,
      0,
    );
    await updateItemOwner(
      NftType.ARCADE_PART,
      tokenId,
      "kirito",
      "kirito",
      NftState.IN_WALLET,
      1,
      0,
    );
    // retrieve item
    const result = await fetchItem(tokenId);
    // item should belong to asuna
    expect(result).toMatchObject({
      ownerWalletAddress: "asuna",
      id: tokenId,
      lastBlock: 2,
    });
  });
});

describe("findMissingBlockNumbers", () => {
  beforeEach(async () => {
    await eraseDatabase();
    // @ts-ignore
    lastMissingFirstNumber = 0;
  });

  it("returns empty list if no blocks exist", async () => {
    const result = await findMissingBlockNumbers();
    expect(result).toStrictEqual([]);
  });

  it("returns empty list if all blocks are contiguous", async () => {
    await recordBlock(0, "block 0", "nothing");
    await recordBlock(1, "block 1", "block 0");
    await recordBlock(2, "block 2", "block 1");
    const result = await findMissingBlockNumbers();
    expect(result).toStrictEqual([]);
  });

  it("can find a gap", async () => {
    await recordBlock(0, "block 0", "nothing");
    await recordBlock(2, "block 2", "block 1");
    const result = await findMissingBlockNumbers();
    expect(result).toStrictEqual([1]);
  });

  it("can find a large gap", async () => {
    await recordBlock(0, "block 0", "nothing");
    await recordBlock(10, "block 10", "block 9");
    const result = await findMissingBlockNumbers();
    expect(result).toStrictEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("can find multiple gaps", async () => {
    await recordBlock(0, "block 0", "nothing");
    await recordBlock(2, "block 2", "block 1");
    await recordBlock(4, "block 4", "block 3");
    await recordBlock(6, "block 6", "block 5");
    const result = await findMissingBlockNumbers();
    expect(result).toStrictEqual([1, 3, 5]);
  });

  it("correct behavior during multiple runs", async () => {
    await recordBlock(0, "block 0", "nothing");
    await recordBlock(2, "block 2", "block 1");
    await recordBlock(4, "block 4", "block 3");
    await recordBlock(6, "block 6", "block 5");
    const result1 = await findMissingBlockNumbers();
    expect(result1).toStrictEqual([1, 3, 5]);
    await recordBlock(1, "block 1", "block 0");
    const result2 = await findMissingBlockNumbers();
    expect(result2).toStrictEqual([3, 5]);
    // 現実にはありえないが、埋まっていたはずのブロックを消すことでBlockの検索範囲をテストしている
    await prisma.block.deleteMany({
      where: {
        number: 1,
      },
    });
    const result3 = await findMissingBlockNumbers();
    expect(result3).toStrictEqual([3, 5]);
  });
});

describe("findMissingBlockHashed", () => {
  beforeEach(async () => {
    await eraseDatabase();
    // @ts-ignore
    lastMissingFirstNumber = 0;
  });
  it("returns empty list if no blocks exist", async () => {
    const result = await findMissingBlockHashes();
    expect(result).toStrictEqual([]);
  });
  it("returns empty list if all blocks are contiguous", async () => {
    await recordBlock(0, "block 0", "nothing");
    await recordBlock(1, "block 1", "block 0");
    await recordBlock(2, "block 2", "block 1");
    const result = await findMissingBlockHashes();
    expect(result).toStrictEqual([]);
  });
  it("can find orphan blocks", async () => {
    await recordBlock(0, "block 0", "nothing");
    await recordBlock(1, "block 1", "block 0");
    await recordBlock(2, "block 2", "block 1a", {
      state: BlockState.CONFIRMED,
    });
    const result = await findMissingBlockHashes();
    expect(result).toStrictEqual(["block 1a"]);
  });
});

describe("getGasPriceFunc", () => {
  const provider = mock<Provider>({
    async getGasPrice(): Promise<BigNumber> {
      return utils.parseUnits("10", "gwei");
    },
  });
  test("極端に小さなRatioを設定", async () => {
    const fn = getGasPriceFunc(provider, 0.00001);
    const gas = await fn();
    expect(gas).toEqual(utils.parseUnits("0.0001", "gwei"));
  });
  test("0.9", async () => {
    const fn = getGasPriceFunc(provider, 0.9);
    const gas = await fn();
    expect(gas).toEqual(utils.parseUnits("9", "gwei"));
  });
  test("1.0", async () => {
    const fn = getGasPriceFunc(provider, 1.0);
    const gas = await fn();
    expect(gas).toEqual(utils.parseUnits("10", "gwei"));
  });
  test("小数桁が多くても計算できる", async () => {
    const fn = getGasPriceFunc(provider, 1.00000000001);
    const gas = await fn();
    expect(gas).toEqual(utils.parseUnits("10", "gwei"));
  });
  test("1.01", async () => {
    const fn = getGasPriceFunc(provider, 1.01);
    const gas = await fn();
    expect(gas).toEqual(utils.parseUnits("10.1", "gwei"));
  });
  test("1.99", async () => {
    const fn = getGasPriceFunc(provider, 1.99);
    const gas = await fn();
    expect(gas).toEqual(utils.parseUnits("19.9", "gwei"));
  });
  test("10.0", async () => {
    const fn = getGasPriceFunc(provider, 10.0);
    const gas = await fn();
    expect(gas).toEqual(utils.parseUnits("100", "gwei"));
  });
  test("20.01", async () => {
    const fn = getGasPriceFunc(provider, 20.01);
    const gas = await fn();
    expect(gas).toEqual(utils.parseUnits("200.1", "gwei"));
  });
});
