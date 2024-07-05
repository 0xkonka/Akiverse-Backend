import prisma from "../src/prisma";
import { question } from "readline-sync";
import {
  ArcadeMachine,
  ArcadePart,
  GameCenter,
  GameCenterArea,
  GameCenterSize,
  NftState,
  User,
} from "@prisma/client";
import { games } from "../src/metadata/games";
import { getCapacity } from "../src/metadata/game-centers";
import { allParts } from "../src/metadata/arcade-parts";
import { choice, info } from "../src/utils";
import { getGameCenterId } from "../src/helpers/game_centers";

// 出力に表示されないカラム名
const HIDE_COLUMNS = [
  "updatedAt",
  "createdAt",
  "xCoordinate",
  "yCoordinate",
  "lastBlock",
  "lastTransactionIndex",
  "physicalWalletAddress",
  "destroyedAt",
];

function randomCoordinate(): number {
  return Math.floor(Math.random() * 41) - 20;
}

function randomPosition(gc: GameCenter): number {
  return Math.floor(Math.random() * getCapacity(gc.size));
}

function randomGameCenterId(size: GameCenterSize): string {
  const index = Math.floor(Math.random() * 1000000);
  const sizes = { SMALL: 1, MEDIUM: 2, LARGE: 3 };
  return getGameCenterId(sizes[size], index);
}

function showTable(items: any[]) {
  const copy: any[] = [];
  for (const item of items) {
    const itemCopy = { ...item };
    for (const hideColumn of HIDE_COLUMNS) {
      delete itemCopy[hideColumn];
    }
    copy.push(itemCopy);
  }
  console.table(copy);
}

async function inputUserEmail(): Promise<string | null> {
  const users = await prisma.user.findMany();
  if (users.length > 0) {
    showTable(users);
    info({
      msg: "Please enter the email address of the account to add demo data for.",
    });
    info({
      msg: "If the address does not match the above list, a new account will be created.",
    });
  } else {
    info({ msg: "No registered users exist. Creating a new account..." });
  }
  const email = question("Email address：");
  return email || null;
}

function getOrCreateUser(email: string): Promise<User> {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: email.split("@")[0],
    },
  });
}

async function createGameCenters(
  user: User,
  count: number,
): Promise<GameCenter[]> {
  info({ msg: "Creating game centers..." });
  const gameCenters: GameCenter[] = [];
  for (let i = 0; i < count; i++) {
    const size = choice(Object.values(GameCenterSize));
    const area = choice(Object.values(GameCenterArea));
    const id = randomGameCenterId(size);
    const state = NftState.IN_AKIVERSE;
    const xCoordinate = randomCoordinate();
    const yCoordinate = randomCoordinate();
    const name = `Akiverse Game Centers (${xCoordinate}, ${yCoordinate})`;
    const gc = await prisma.gameCenter.create({
      data: {
        id,
        userId: user.id,
        ownerWalletAddress: user.walletAddress,
        state,
        name,
        xCoordinate,
        yCoordinate,
        area,
        size,
        placementAllowed: Math.random() < 0.5,
      },
    });
    gameCenters.push(gc);
  }
  return gameCenters;
}

async function createArcadeMachines(
  user: User,
  count: number,
): Promise<ArcadeMachine[]> {
  info({ msg: "Creating arcade machines..." });
  const gameCenters = await prisma.gameCenter.findMany({
    where: { placementAllowed: true },
  });
  const arcadeMachines: ArcadeMachine[] = [];
  for (let i = 0; i < count; i++) {
    const state = NftState.IN_AKIVERSE;
    const game = choice(Object.keys(games));
    const maxEnergy = 10000;
    const energy = Math.floor(Math.random() * (maxEnergy + 1));
    let position: number | null = null;
    let gameCenterId: string | null = null;
    if (gameCenters.length > 0 && Math.random() < 0.6) {
      const gc = choice(gameCenters);
      gameCenterId = gc.id;
      position = randomPosition(gc);
    }
    try {
      const am = await prisma.arcadeMachine.create({
        data: {
          userId: user.id,
          accumulatorSubCategory: "HOKUTO_100_LX",
          ownerWalletAddress: user.walletAddress,
          state,
          game,
          energy,
          maxEnergy,
          position,
          gameCenterId,
        },
      });
      arcadeMachines.push(am);
    } catch (e) {
      // Likely failed a uniqueness constraint. TODO?
      continue;
    }
  }
  return arcadeMachines;
}

async function createArcadeParts(
  user: User,
  count: number,
): Promise<ArcadePart[]> {
  info({ msg: "Creating arcade parts..." });
  const arcadeParts: ArcadePart[] = [];
  for (let i = 0; i < count; i++) {
    const state = NftState.IN_AKIVERSE;
    const { category, subCategory } = choice(allParts);
    const ap = await prisma.arcadePart.create({
      data: {
        userId: user.id,
        ownerWalletAddress: user.walletAddress,
        state,
        category,
        subCategory,
      },
    });
    arcadeParts.push(ap);
  }
  return arcadeParts;
}

async function main() {
  const email = await inputUserEmail();
  if (email === null) {
    info({ msg: "Canceled." });
    return;
  }
  const user = await getOrCreateUser(email);
  const gameCenters = await createGameCenters(user, 10);
  showTable(gameCenters);
  const arcadeMachines = await createArcadeMachines(user, 10);
  showTable(arcadeMachines);
  const arcadeParts = await createArcadeParts(user, 20);
  showTable(arcadeParts);
}

if (require.main === module) {
  main();
}
