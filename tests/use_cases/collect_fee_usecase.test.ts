import { eraseDatabase } from "../test_helper";
import { CollectFeeUseCaseImpl } from "../../src/use_cases/collect_fee_usecase";
import prisma from "../../src/prisma";
import {
  ArcadeMachine,
  CollectState,
  GameCenter,
  PaymentState,
  User,
  Prisma,
} from "@prisma/client";
import { v4 as uuid } from "uuid";
import dayjs from "dayjs";
import { INSTALLATION_FEE_OF_DAY, TERM_TIME_ZONE } from "../../src/constants";

const useCase = new CollectFeeUseCaseImpl();

const targetDateStr = "20230228";
const targetDate = dayjs(targetDateStr, "YYYYMMDD").tz(TERM_TIME_ZONE).toDate();

const installedAtYesterday = dayjs("20230227", "YYYYMMDD")
  .tz(TERM_TIME_ZONE)
  .toDate();
const installedAtToday = targetDate;

describe("remove arcade machines because automatic renew disabled", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const gc = await createGameCenter();
    const amYesterday = await createArcadeMachine({
      gameCenterId: gc.id,
      position: 1,
      installedAt: installedAtYesterday,
      autoRenewLease: false,
    });
    const amToday = await createArcadeMachine({
      gameCenterId: gc.id,
      position: 2,
      installedAt: installedAtToday,
      autoRenewLease: false,
    });
    await useCase.removeArcadeMachinesWithAutomaticRenewDisabled(targetDate);

    const afterAMYesterday = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: amYesterday.id },
    });
    expect(afterAMYesterday.gameCenterId).toBeNull();
    expect(afterAMYesterday.position).toBeNull();

    const afterAMToday = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: amToday.id },
    });
    expect(afterAMToday.gameCenterId).toEqual(gc.id);
    expect(afterAMToday.position).not.toBeNull();
  });
});

describe("remove arcade machines because gameCenter placementAllowed disable", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const gcTrue = await createGameCenter({ placementAllowed: true });
    const amTrue = await createArcadeMachine({
      gameCenterId: gcTrue.id,
      position: 1,
      installedAt: installedAtYesterday,
      autoRenewLease: true,
    });
    const gcFalse = await createGameCenter({ placementAllowed: false });
    const amFalse = await createArcadeMachine({
      gameCenterId: gcFalse.id,
      position: 1,
      installedAt: installedAtYesterday,
      autoRenewLease: true,
    });
    // 処理対象日になってから設置されたAMは24時間分の賃料を払っているので撤去されない
    const amInstalledToday = await createArcadeMachine({
      gameCenterId: gcFalse.id,
      position: 2,
      installedAt: installedAtToday,
      autoRenewLease: true,
    });

    await useCase.removeArcadeMachinesInPlacementNotAllowedGameCenters(
      targetDate,
    );

    const afterAmTrue = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: amTrue.id },
    });
    expect(afterAmTrue.gameCenterId).toEqual(gcTrue.id);

    const afterAmFalse = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: amFalse.id },
    });
    expect(afterAmFalse.gameCenterId).toBeNull();

    const afterAmInstalledToday = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: amInstalledToday.id },
    });
    expect(afterAmInstalledToday.gameCenterId).toEqual(gcFalse.id);
  });
});

async function createUser(extraData = {}): Promise<User> {
  return prisma.user.create({
    data: {
      email: uuid(),
      name: "",
      ...extraData,
    },
  });
}

async function createArcadeMachine(extraData = {}): Promise<ArcadeMachine> {
  return prisma.arcadeMachine.create({
    data: {
      game: "BUBBLE_ATTACK",
      autoRenewLease: true,
      accumulatorSubCategory: "HOKUTO_100_LX",
      ...extraData,
    },
  });
}

async function createGameCenter(extraData = {}): Promise<GameCenter> {
  return prisma.gameCenter.create({
    data: {
      id: uuid(),
      name: uuid(),
      area: "AKIHABARA",
      size: "LARGE",
      xCoordinate: 1,
      yCoordinate: 1,
      ...extraData,
    },
  });
}

describe("insertCollectFees", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const gco = await createUser();
    const amo = await createUser();
    // 当日支払っているAMは含まれないことを確認する
    // GCO=AMOのレコードが含まれないこと
    const gc = await createGameCenter({
      placementAllowed: true,
      userId: gco.id,
    });
    // 前日に設置されたAMはInsert対象
    const amYesterday = await createArcadeMachine({
      gameCenterId: gc.id,
      position: 1,
      autoRenewLease: true,
      installedAt: installedAtYesterday,
      userId: amo.id,
    });
    // 当日InstallされたAMはInsert対象外
    const amToday = await createArcadeMachine({
      gameCenterId: gc.id,
      position: 2,
      autoRenewLease: true,
      installedAt: installedAtToday,
      userId: amo.id,
    });

    // AMO=GCOのAMはInsert対象外
    const amSameOwner = await createArcadeMachine({
      gameCenterId: gc.id,
      position: 3,
      autoRenewLease: true,
      installedAt: installedAtYesterday,
      userId: gco.id,
    });

    // 処理実行
    await useCase.insertCollectData(targetDate);

    // Insert結果確認
    const collectRecord = await prisma.rentalFee.findMany({
      where: {
        date: targetDateStr,
        arcadeMachineId: {
          in: [amYesterday.id, amToday.id, amSameOwner.id],
        },
      },
    });
    expect(collectRecord).toHaveLength(1);
    const record = collectRecord[0];
    expect(record).toMatchObject({
      date: targetDateStr,
      arcadeMachineId: amYesterday.id,
      arcadeMachineOwnerId: amo.id,
      fee: INSTALLATION_FEE_OF_DAY,
      gameCenterId: gc.id,
      gameCenterOwnerId: gco.id,
      collectState: CollectState.UNPROCESSED,
      paymentState: PaymentState.UNPROCESSED,
    });
  });
  test("rerun", async () => {
    // 再実行時、当日分のレコードがすでに存在していたら処理しない
    const before = await prisma.rentalFee.create({
      data: {
        date: targetDateStr,
        arcadeMachineId: "am1",
        arcadeMachineOwnerId: uuid(),
        gameCenterId: "gc1",
        gameCenterOwnerId: uuid(),
        fee: INSTALLATION_FEE_OF_DAY,
      },
    });

    // 処理実行
    await useCase.insertCollectData(targetDate);

    const afters = await prisma.rentalFee.findMany({
      where: { date: targetDateStr },
    });
    expect(afters).toHaveLength(1);
    const after = afters[0];
    expect(after).toEqual(before);
  });
});
describe("collect fees", () => {
  beforeEach(async () => {
    await eraseDatabase();
    position = 0;
  });
  let position = 0;
  async function createTestData(user: User, gc: GameCenter): Promise<void> {
    await createArcadeMachine({
      userId: user.id,
      gameCenterId: gc.id,
      position: ++position,
      installedAt: installedAtYesterday,
      autoRenewLease: true,
    });
    await createArcadeMachine({
      userId: user.id,
      gameCenterId: gc.id,
      position: ++position,
      installedAt: installedAtYesterday,
      autoRenewLease: true,
    });
  }
  test("success", async () => {
    const gco = await createUser();
    const gc = await createGameCenter({
      userId: gco.id,
      placementAllowed: true,
      name: "gco",
    });
    // Owner Teras > fees 支払いOK
    const richOwner = await createUser({
      terasBalance: INSTALLATION_FEE_OF_DAY.mul(2).add(100000),
      name: "rich",
    });
    await createTestData(richOwner, gc);

    // Owner Teras = fees 支払いOK
    const sameOwner = await createUser({
      terasBalance: INSTALLATION_FEE_OF_DAY.mul(2),
      name: "same",
    });
    await createTestData(sameOwner, gc);

    let expectInsertedCount = 4;
    let expectCollectedCount = 4;
    let poorOwner;
    if (INSTALLATION_FEE_OF_DAY.gt(0)) {
      // Owner Teras < fees 支払いNG
      poorOwner = await createUser({
        terasBalance: INSTALLATION_FEE_OF_DAY.mul(2).sub(1),
        name: "poor",
      });
      await createTestData(poorOwner, gc);
      expectInsertedCount += 2;
      expectCollectedCount += 1;
    }

    await useCase.insertCollectData(targetDate);
    const insertedCount = await prisma.rentalFee.count({
      where: { date: targetDateStr },
    });
    // 処理対象のレコード数チェック
    expect(insertedCount).toEqual(expectInsertedCount);

    // 処理実行
    await useCase.collectFees(targetDateStr);

    // 処理結果確認
    // 6行中 5行は徴収済みになっている
    const collectedCount = await prisma.rentalFee.count({
      where: { date: targetDateStr, collectState: CollectState.COLLECTED },
    });
    expect(collectedCount).toEqual(expectCollectedCount);

    if (INSTALLATION_FEE_OF_DAY.gt(0)) {
      // 1行はUNINSTALLEDになっている
      const uninstalledCount = await prisma.rentalFee.count({
        where: { date: targetDateStr, collectState: CollectState.UNINSTALLED },
      });
      expect(uninstalledCount).toEqual(1);
    }

    // AMOのTeras Balanceチェック
    const afterRichOwner = await prisma.user.findUniqueOrThrow({
      where: { id: richOwner.id },
    });
    expect(afterRichOwner.terasBalance).toEqual(new Prisma.Decimal(100000));

    const afterSameOwner = await prisma.user.findUniqueOrThrow({
      where: { id: sameOwner.id },
    });
    expect(afterSameOwner.terasBalance).toEqual(new Prisma.Decimal(0));

    // 設置料が無料の間は払えないことが発生しないのでコメントアウト Start
    if (INSTALLATION_FEE_OF_DAY.gt(0)) {
      const afterPoorOwner = await prisma.user.findUniqueOrThrow({
        where: { id: poorOwner!.id },
      });
      expect(afterPoorOwner.terasBalance).toEqual(
        INSTALLATION_FEE_OF_DAY.sub(1),
      );
    }

    // AM処理結果確認
    // richOwner/sameOwnerのAMは設置されたまま
    const afterArcadeMachinesRichAndSameOwner =
      await prisma.arcadeMachine.findMany({
        where: { userId: { in: [richOwner.id, sameOwner.id] } },
      });
    expect(afterArcadeMachinesRichAndSameOwner).toHaveLength(4);
    for (const am of afterArcadeMachinesRichAndSameOwner) {
      expect(am.gameCenterId).toEqual(gc.id);
      expect(am.position).not.toBeNull();
    }

    // 設置料が無料の間は払えないことが発生しないのでコメントアウト Start
    if (INSTALLATION_FEE_OF_DAY.gt(0)) {
      // poorOwnerのAMは片方外れている
      const afterArcadeMachinePoorOwner = await prisma.arcadeMachine.findMany({
        where: { userId: poorOwner!.id },
      });
      expect(afterArcadeMachinePoorOwner).toHaveLength(2);

      const installedAM = afterArcadeMachinePoorOwner.find(
        (v) => v.gameCenterId === gc.id,
      );
      expect(installedAM).not.toBeNull();

      const uninstalledAM = afterArcadeMachinePoorOwner.find(
        (v) => v.gameCenterId !== gc.id,
      );
      expect(uninstalledAM).not.toBeNull();
      // 設置料が無料の間は払えないことが発生しないのでコメントアウト End
    }
  });
  // 設置料が無料の間は個別徴収ルートに入り得ないのでテストスキップ
  test("処理中にTeras残高が減少していて料金不足になったら個別に徴収できるところまで徴収する", async () => {
    const gco = await createUser();
    const gc = await createGameCenter({
      userId: gco.id,
      placementAllowed: true,
    });
    const amo = await createUser({
      terasBalance: INSTALLATION_FEE_OF_DAY.mul(2),
    });
    const am1 = await createArcadeMachine({
      userId: amo.id,
      gameCenterId: gc.id,
      position: 1,
      installedAt: installedAtYesterday,
      autoRenewLease: true,
    });
    const am2 = await createArcadeMachine({
      userId: amo.id,
      gameCenterId: gc.id,
      position: 2,
      installedAt: installedAtYesterday,
      autoRenewLease: true,
    });
    await useCase.insertCollectData(targetDate);

    // create mock
    const orgMethod = prisma.user.findUniqueOrThrow;
    (prisma.user.findUniqueOrThrow as jest.Mock) = jest
      .fn()
      .mockImplementation(async (args) => {
        const orgRet = await orgMethod(args);
        await prisma.user.update({
          where: {
            id: amo.id,
          },
          data: {
            terasBalance: {
              decrement: new Prisma.Decimal(1),
            },
          },
        });
        return orgRet;
      });
    await useCase.collectFees(targetDateStr);

    // mock戻す
    prisma.user.findUniqueOrThrow = orgMethod;

    const afterAmo = await prisma.user.findUniqueOrThrow({
      where: { id: amo.id },
    });
    expect(afterAmo.terasBalance).toEqual(INSTALLATION_FEE_OF_DAY.sub(1));

    const AMs = await prisma.arcadeMachine.findMany({
      where: { id: { in: [am1.id, am2.id] } },
    });

    expect(AMs).toHaveLength(2);

    const installedAM = AMs.find((v) => v.gameCenterId === gc.id);
    expect(installedAM).not.toBeNull();
    const uninstalledAM = AMs.find((v) => v.gameCenterId !== gc.id);
    expect(uninstalledAM).not.toBeNull();

    const afterTempCollectFees = await prisma.rentalFee.findMany({
      where: { date: targetDateStr },
    });
    expect(afterTempCollectFees).toHaveLength(2);
    const processedRecord = afterTempCollectFees.find(
      (v) => v.collectState === CollectState.COLLECTED,
    );
    expect(processedRecord).not.toBeNull();
    const uninstalledRecord = afterTempCollectFees.find(
      (v) => v.collectState === CollectState.UNINSTALLED,
    );
    expect(uninstalledRecord).not.toBeNull();
  });
  test("rerun", async () => {
    // 再実行時に処理済みだったものは処理しないこと
    // 未処理のものは処理されることを確認
    const gco = await createUser();
    const gc = await createGameCenter({
      userId: gco.id,
      placementAllowed: true,
    });
    const amo = await createUser({
      terasBalance: INSTALLATION_FEE_OF_DAY.mul(2),
    });
    await createArcadeMachine({
      userId: amo.id,
      gameCenterId: gc.id,
      position: 1,
      autoRenewLease: true,
      installedAt: installedAtYesterday,
    });

    await useCase.insertCollectData(targetDate);
    await prisma.rentalFee.createMany({
      data: [
        {
          date: targetDateStr,
          arcadeMachineId: "am1",
          arcadeMachineOwnerId: amo.id,
          gameCenterId: "gc",
          gameCenterOwnerId: gco.id,
          fee: INSTALLATION_FEE_OF_DAY,
          collectState: CollectState.COLLECTED,
          collectDate: new Date(),
        },
        {
          date: targetDateStr,
          arcadeMachineId: "am2",
          arcadeMachineOwnerId: amo.id,
          gameCenterId: "gc",
          gameCenterOwnerId: gco.id,
          fee: INSTALLATION_FEE_OF_DAY,
          collectState: CollectState.UNINSTALLED,
          collectDate: new Date(),
        },
      ],
    });

    await useCase.collectFees(targetDateStr);
    const afterAmo = await prisma.user.findUniqueOrThrow({
      where: { id: amo.id },
    });
    expect(afterAmo.terasBalance).toEqual(INSTALLATION_FEE_OF_DAY);

    const afterTempRecords = await prisma.rentalFee.findMany({
      where: { date: targetDateStr },
    });
    expect(afterTempRecords).toHaveLength(3);
  });
});

describe("payment fees", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const gco1 = await createUser();
    const gc1 = await createGameCenter({ userId: gco1.id });
    await prisma.rentalFee.createMany({
      data: [
        {
          date: targetDateStr,
          arcadeMachineId: "am1",
          arcadeMachineOwnerId: uuid(),
          gameCenterId: gc1.id,
          gameCenterOwnerId: gco1.id,
          fee: INSTALLATION_FEE_OF_DAY,
          collectState: CollectState.COLLECTED,
          collectDate: new Date(),
        },
      ],
    });

    const gco2 = await createUser();
    const gc2_1 = await createGameCenter({ userId: gco2.id });
    const gc2_2 = await createGameCenter({ userId: gco2.id });
    await prisma.rentalFee.createMany({
      data: [
        {
          date: targetDateStr,
          arcadeMachineId: "am2",
          arcadeMachineOwnerId: uuid(),
          gameCenterId: gc2_1.id,
          gameCenterOwnerId: gco2.id,
          fee: INSTALLATION_FEE_OF_DAY,
          collectState: CollectState.COLLECTED,
          collectDate: new Date(),
        },
        {
          date: targetDateStr,
          arcadeMachineId: "am3",
          arcadeMachineOwnerId: uuid(),
          gameCenterId: gc2_2.id,
          gameCenterOwnerId: gco2.id,
          fee: INSTALLATION_FEE_OF_DAY,
          collectState: CollectState.COLLECTED,
          collectDate: new Date(),
        },
      ],
    });

    // AMOから料金徴収できなかった分は加算されないことの確認
    const gco3 = await createUser();
    const gc3_1 = await createGameCenter({ userId: gco3.id });
    const gc3_2 = await createGameCenter({ userId: gco3.id });
    const gc3_3 = await createGameCenter({ userId: gco3.id });
    await prisma.rentalFee.createMany({
      data: [
        {
          date: targetDateStr,
          arcadeMachineId: "am4",
          arcadeMachineOwnerId: uuid(),
          gameCenterId: gc3_1.id,
          gameCenterOwnerId: gco3.id,
          fee: INSTALLATION_FEE_OF_DAY,
          collectState: CollectState.COLLECTED,
          collectDate: new Date(),
        },
        // gc3_2分は徴収できない
        {
          date: targetDateStr,
          arcadeMachineId: "am5",
          arcadeMachineOwnerId: uuid(),
          gameCenterId: gc3_2.id,
          gameCenterOwnerId: gco3.id,
          fee: INSTALLATION_FEE_OF_DAY,
          collectState: CollectState.UNINSTALLED,
          collectDate: new Date(),
        },
        {
          date: targetDateStr,
          arcadeMachineId: "am6",
          arcadeMachineOwnerId: uuid(),
          gameCenterId: gc3_3.id,
          gameCenterOwnerId: gco3.id,
          fee: INSTALLATION_FEE_OF_DAY,
          collectState: CollectState.COLLECTED,
          collectDate: new Date(),
        },
      ],
    });

    await useCase.payFees(targetDateStr);
    const processedCount = await prisma.rentalFee.count({
      where: { date: targetDateStr, paymentState: PaymentState.PAID },
    });

    expect(processedCount).toEqual(5);

    // GCOのTeras状況確認
    const afterGco1 = await prisma.user.findUniqueOrThrow({
      where: { id: gco1.id },
    });
    expect(afterGco1.terasBalance).toEqual(
      new Prisma.Decimal(INSTALLATION_FEE_OF_DAY),
    );
    const afterGco2 = await prisma.user.findUniqueOrThrow({
      where: { id: gco2.id },
    });
    expect(afterGco2.terasBalance).toEqual(INSTALLATION_FEE_OF_DAY.mul(2));

    const afterGco3 = await prisma.user.findUniqueOrThrow({
      where: { id: gco3.id },
    });
    // GC3-2分は徴収できていないので2AM分のTerasを保有している
    expect(afterGco3.terasBalance).toEqual(INSTALLATION_FEE_OF_DAY.mul(2));
  });
  test("rerun", async () => {
    // 再実行時にPROCESSEDは処理されない、UNPROCESSEDは処理されることを確認
    const processedGco = await createUser();
    const unprocessedGco = await createUser();

    await prisma.rentalFee.createMany({
      data: [
        {
          date: targetDateStr,
          arcadeMachineId: "am1",
          arcadeMachineOwnerId: uuid(),
          gameCenterId: "gc1",
          gameCenterOwnerId: processedGco.id,
          fee: INSTALLATION_FEE_OF_DAY,
          collectState: CollectState.COLLECTED,
          collectDate: new Date(),
          paymentState: PaymentState.PAID,
          paymentDate: new Date(),
        },
        {
          date: targetDateStr,
          arcadeMachineId: "am2",
          arcadeMachineOwnerId: uuid(),
          gameCenterId: "gc2",
          gameCenterOwnerId: unprocessedGco.id,
          fee: INSTALLATION_FEE_OF_DAY,
          collectState: CollectState.COLLECTED,
          collectDate: new Date(),
        },
      ],
    });
    await useCase.payFees(targetDateStr);

    const afterProcessedGco = await prisma.user.findUniqueOrThrow({
      where: { id: processedGco.id },
    });
    expect(afterProcessedGco.terasBalance).toEqual(new Prisma.Decimal(0));

    const afterUnprocessedGco = await prisma.user.findUniqueOrThrow({
      where: { id: unprocessedGco.id },
    });
    expect(afterUnprocessedGco.terasBalance).toEqual(INSTALLATION_FEE_OF_DAY);
  });
});
