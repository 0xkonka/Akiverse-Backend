import {
  ArcadeMachine,
  ArcadePart,
  Block,
  GameCenter,
  GameCenterArea,
  GameCenterSize,
  User,
} from "@prisma/client";
import prisma from "../src/prisma";
import { v4 as uuidv4 } from "uuid";
import Web3 from "web3";
import {
  AkiverseLocker,
  ArcadeMachine as ArcadeMachineContract,
  ArcadeParts as ArcadePartContract,
} from "@victgame/akiverse-deposit-withdraw-contracts";
import {
  AKIR as AkirContract,
  AKV as AkvContract,
} from "@victgame/akiverse-ft-contracts/dist/types";
import { ethers } from "ethers";

let truncateQuery: string;
export const eraseDatabase = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && databaseUrl.includes("test")) {
    if (truncateQuery === undefined) {
      const tablenames = await prisma.$queryRaw<
        Array<{ tablename: string }>
      >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

      const tables = tablenames
        .map(({ tablename }) => tablename)
        .filter((name) => name !== "_prisma_migrations")
        .map((name) => `"public"."${name}"`)
        .join(", ");
      truncateQuery = `TRUNCATE TABLE ${tables} CASCADE;`;
    }

    try {
      await prisma.$executeRawUnsafe(truncateQuery);
    } catch (error) {
      console.log({ error });
    }
  } else {
    // not a test database
    throw new Error("DATABASE_URL must contain the word 'test'");
  }
};

export async function createUser(extraData = {}): Promise<User> {
  return await prisma.user.create({
    data: {
      name: "Shindou Hikaru",
      email: "hikaru@vict.sg",
      walletAddress: "0x1f373932e537341Af1012cBd2982871eC5932b2c",
      ...extraData,
    },
  });
}

export async function createRandomUser(extraData = {}): Promise<User> {
  const random = uuidv4();
  const web3 = new Web3();
  const account = web3.eth.accounts.create();
  return await prisma.user.create({
    data: {
      name: random,
      email: random,
      walletAddress: account.address,
      ...extraData,
    },
  });
}

export async function createGameCenter(extraData = {}): Promise<GameCenter> {
  return await prisma.gameCenter.create({
    data: {
      name: "test",
      id: "1",
      size: GameCenterSize.SMALL,
      xCoordinate: 1,
      yCoordinate: 1,
      area: GameCenterArea.AKIHABARA,
      ...extraData,
    },
  });
}

export async function createArcadeMachine(
  extraData = {},
): Promise<ArcadeMachine> {
  return await prisma.arcadeMachine.create({
    data: {
      game: "BUBBLE_ATTACK",
      accumulatorSubCategory: "HOKUTO_100_LX",
      ...extraData,
    },
  });
}

export async function createArcadePart(extraData = {}): Promise<ArcadePart> {
  return await prisma.arcadePart.create({
    data: {
      category: "ACCUMULATOR",
      subCategory: "HOKUTO_100_LX",
      id: "1",
      ...extraData,
    },
  });
}

// Convenience function for test
export async function recordBlock(
  number: number,
  hash: string,
  parentHash: string,
  extraData = {},
) {
  // create new item
  const block: Block = await prisma.block.create({
    data: { number, hash, parentHash, ...extraData },
  });
}

export async function depositArcadeMachine(
  lockerContract: AkiverseLocker,
  arcadeMachineContract: ArcadeMachineContract,
  signer: ethers.Wallet,
  amId: string,
) {
  await arcadeMachineContract
    .connect(signer)
    .approve(lockerContract.address, amId);
  await lockerContract.connect(signer).depositArcadeMachine(amId);
}

export async function depositArcadePart(
  lockerContract: AkiverseLocker,
  arcadePartContract: ArcadePartContract,
  signer: ethers.Wallet,
  apId: string,
) {
  await arcadePartContract
    .connect(signer)
    .approve(lockerContract.address, apId);
  await lockerContract.connect(signer).depositArcadeParts(apId);
}

export async function depositAkir(
  lockerContract: AkiverseLocker,
  akirContract: AkirContract,
  signer: ethers.Wallet,
  amount: string,
) {
  await akirContract.connect(signer).approve(lockerContract.address, amount);
  await lockerContract.connect(signer).depositAkir(amount);
}

export async function depositAkv(
  lockerContract: AkiverseLocker,
  akvContract: AkvContract,
  signer: ethers.Wallet,
  amount: string,
) {
  await akvContract.connect(signer).approve(lockerContract.address, amount);
  await lockerContract.connect(signer).depositAkv(amount);
}
