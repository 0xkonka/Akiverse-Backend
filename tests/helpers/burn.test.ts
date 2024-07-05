import {
  createArcadeMachine,
  createArcadePart,
  createUser,
  eraseDatabase,
} from "../test_helper";
import prisma from "../../src/prisma";
import { burnArcadeMachine, burnArcadePart } from "../../src/helpers/burn";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
} from "../../src/use_cases/errors";

describe("burn arcade machine", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("can burn", async () => {
    const user = await createUser();
    const beforeArcadeMachine = await createArcadeMachine({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      physicalWalletAddress: user.walletAddress,
      destroyedAt: new Date(),
    });
    const amWithUser = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: beforeArcadeMachine.id },
      include: { user: true },
    });
    const burn = await burnArcadeMachine(amWithUser);
    expect(burn).toMatchObject({
      nftType: "ARCADE_MACHINE",
      state: "UNPROCESSED",
      tokenId: beforeArcadeMachine.id,
      userId: user.id,
    });
    const afterArcadeMachine = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: beforeArcadeMachine.id },
    });
    expect(afterArcadeMachine).toMatchObject({ state: "BURNING" });
  });
  test("can burn without burn record", async () => {
    const user = await createUser();
    const beforeArcadeMachine = await createArcadeMachine({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      physicalWalletAddress: null,
      destroyedAt: new Date(),
    });
    const amWithUser = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: beforeArcadeMachine.id },
      include: { user: true },
    });
    const burn = await burnArcadeMachine(amWithUser);
    expect(burn).toBeUndefined();
    const afterArcadeMachine = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: beforeArcadeMachine.id },
    });
    expect(afterArcadeMachine).toMatchObject({ state: "BURNED" });
  });
  test("cannot burn if state not IN_AKIVERSE", async () => {
    const user = await createUser();
    const beforeArcadeMachine = await createArcadeMachine({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      physicalWalletAddress: user.walletAddress,
      destroyedAt: new Date(),
      state: "IN_WALLET",
    });
    const amWithUser = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: beforeArcadeMachine.id },
      include: { user: true },
    });
    await expect(burnArcadeMachine(amWithUser)).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("cannot burn if not destroyed", async () => {
    const user = await createUser();
    const beforeArcadeMachine = await createArcadeMachine({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      physicalWalletAddress: user.walletAddress,
    });
    const amWithUser = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: beforeArcadeMachine.id },
      include: { user: true },
    });
    await expect(burnArcadeMachine(amWithUser)).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("cannot burn if information is out of date", async () => {
    const user = await createUser();
    const beforeArcadeMachine = await createArcadeMachine({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      physicalWalletAddress: user.walletAddress,
      destroyedAt: new Date(),
      feverSparkRemain: 2,
    });
    const amWithUser = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: beforeArcadeMachine.id },
      include: { user: true },
    });
    // 強制Updateする
    await prisma.arcadeMachine.update({
      where: { id: beforeArcadeMachine.id },
      data: {
        feverSparkRemain: 1,
      },
    });
    await expect(burnArcadeMachine(amWithUser)).rejects.toThrowError(
      ConflictUseCaseError,
    );
  });
});

describe("burn arcade part", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("can burn", async () => {
    const user = await createUser();
    const beforeArcadePart = await createArcadePart({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      physicalWalletAddress: user.walletAddress,
      destroyedAt: new Date(),
    });
    const apWithUser = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: beforeArcadePart.id },
      include: { user: true },
    });
    const burn = await burnArcadePart(apWithUser);
    expect(burn).toMatchObject({
      nftType: "ARCADE_PART",
      state: "UNPROCESSED",
      tokenId: beforeArcadePart.id,
      userId: user.id,
    });
    const afterArcadePart = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: beforeArcadePart.id },
    });
    expect(afterArcadePart).toMatchObject({ state: "BURNING" });
  });
  test("can burn without burn record", async () => {
    const user = await createUser();
    const beforeArcadePart = await createArcadePart({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      physicalWalletAddress: null,
      destroyedAt: new Date(),
    });
    const apWithUser = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: beforeArcadePart.id },
      include: { user: true },
    });
    const burn = await burnArcadePart(apWithUser);
    expect(burn).toBeUndefined();
    const afterArcadePart = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: beforeArcadePart.id },
    });
    expect(afterArcadePart).toMatchObject({ state: "BURNED" });
  });
  test("cannot burn if state not IN_AKIVERSE", async () => {
    const user = await createUser();
    const beforeArcadePart = await createArcadePart({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      physicalWalletAddress: user.walletAddress,
      destroyedAt: new Date(),
      state: "IN_WALLET",
    });
    const apWithUser = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: beforeArcadePart.id },
      include: { user: true },
    });
    await expect(burnArcadePart(apWithUser)).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("cannot burn if not destroyed", async () => {
    const user = await createUser();
    const beforeArcadePart = await createArcadePart({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      physicalWalletAddress: user.walletAddress,
    });
    const apWithUser = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: beforeArcadePart.id },
      include: { user: true },
    });
    await expect(burnArcadePart(apWithUser)).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("cannot burn if information is out of date", async () => {
    const user = await createUser();
    const beforeArcadePart = await createArcadePart({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      physicalWalletAddress: user.walletAddress,
      destroyedAt: new Date(),
    });
    const apWithUser = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: beforeArcadePart.id },
      include: { user: true },
    });
    // 強制Updateする
    await prisma.arcadePart.update({
      where: { id: beforeArcadePart.id },
      data: {
        updatedAt: new Date(),
      },
    });
    await expect(burnArcadePart(apWithUser)).rejects.toThrowError(
      ConflictUseCaseError,
    );
  });
});
