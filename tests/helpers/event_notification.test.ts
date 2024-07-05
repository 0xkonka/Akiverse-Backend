import {
  notifyAmDeposit,
  notifyAmInstall,
  notifyAmUninstall,
  notifyAmUninstallBecauseAutoRenewDisabled,
  notifyAmUninstallBecauseStopRenting,
  notifyAmWithdraw,
  notifyApDeposit,
  notifyApWithdraw,
  notifyCraft,
  notifyGcDeposit,
  notifyGcWithdraw,
  notifyRentalFeeCollect,
  notifyRentalFeePayment,
  notifyStartRentOut,
  notifyStopRentingReserve,
} from "../../src/helpers/event_notification";
import {
  createArcadeMachine,
  createArcadePart,
  createGameCenter,
  eraseDatabase,
} from "../test_helper";
import { createMockContext } from "../mock/context";
import prisma from "../../src/prisma";
import {
  CollectState,
  NftType,
  Notification,
  NotificationType,
  PaymentState,
} from "@prisma/client";
import dayjs from "dayjs";
import { TERM_TIME_ZONE } from "../../src/constants";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { getArcadePartMetadata } from "../../src/metadata/arcade-parts";
import {
  Activity_Craft,
  Information_AmDeposit,
  Information_AmInstallForAMO,
  Information_AmInstallForGCO,
  Information_AmUninstallBecauseAutoRenewDisabledForAMO,
  Information_AmUninstallBecauseAutoRenewDisabledForGCO,
  Information_AmUninstallBecauseCouldNotPayTheRentalFeeForAMO,
  Information_AmUninstallBecauseCouldNotPayTheRentalFeeForGCO,
  Information_AmUninstallBecauseStopRentingForAMO,
  Information_AmWithdraw,
  Information_ApDeposit,
  Information_ApWithdraw,
  Information_CollectRentalFee,
  Information_Craft,
  Information_Detail_CollectRentalFee,
  Information_Detail_PaymentRentalFee,
  Information_GcDeposit,
  Information_GcRentOut,
  Information_GcStopRentingExecute,
  Information_GcStopRentingReserveForAMO,
  Information_GcStopRentingReserveForGCO,
  Information_GcWithdraw,
  Information_PaymentRentalFee,
} from "../../src/models/external/event_message";

dayjs.extend(timezone);
dayjs.extend(utc);

type arcadeMachineWithGameCenterOwnerId = {
  id: string;
  userId: string | null;
  gameCenter: {
    id: string;
    userId: string | null;
  } | null;
};
describe("event notification", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  describe("GCのDeposit", () => {
    test("success", async () => {
      const ctx = await createMockContext();
      const gc = await createGameCenter({ userId: ctx.userId });
      await notifyGcDeposit(gc.id);
      const after = await prisma.notification.findMany({});
      expect(after).toHaveLength(1);
      const record = after[0];
      expect(record).toMatchObject({
        userId: ctx.userId,
        notificationType: NotificationType.INFORMATION,
        tokenId: gc.id,
        nftType: NftType.GAME_CENTER,
      });
      const parsed = Information_GcDeposit.parse(record.messageJson);
      expect(parsed).toEqual({
        gameCenterId: gc.id,
        messageId: "I00001",
      });
    });
  });
  describe("GCのWithdraw", () => {
    test("success", async () => {
      const ctx = await createMockContext();
      const gc = await createGameCenter({ userId: ctx.userId });
      await notifyGcWithdraw(gc.id);
      const after = await prisma.notification.findMany({});
      expect(after).toHaveLength(1);
      const record = after[0];
      expect(record).toMatchObject({
        userId: ctx.userId,
        notificationType: NotificationType.INFORMATION,
        tokenId: gc.id,
        nftType: NftType.GAME_CENTER,
      });
      const parsed = Information_GcWithdraw.parse(record.messageJson);
      expect(parsed).toEqual({
        gameCenterId: gc.id,
        messageId: "I00002",
      });
    });
  });
  describe("募集開始", () => {
    test("success", async () => {
      const ctx = await createMockContext();
      const gc = await createGameCenter({ userId: ctx.userId });
      await notifyStartRentOut(ctx.userId!, gc.id);
      const after = await prisma.notification.findMany({});
      expect(after).toHaveLength(1);
      const record = after[0];
      expect(record).toMatchObject({
        userId: ctx.userId,
        notificationType: NotificationType.INFORMATION,
        tokenId: gc.id,
        nftType: NftType.GAME_CENTER,
      });
      const parsed = Information_GcRentOut.parse(record.messageJson);
      expect(parsed).toEqual({
        gameCenterId: gc.id,
        messageId: "I00003",
      });
    });
  });
  describe("募集停止予約", () => {
    test("success", async () => {
      const ctx = await createMockContext();
      const gc = await createGameCenter({
        userId: ctx.userId,
        placementAllowed: false,
      });
      const amo1Ctx = await createMockContext();
      await createArcadeMachine({
        id: "1",
        userId: amo1Ctx.userId,
        gameCenterId: gc.id,
        position: 1,
      });
      await createArcadeMachine({
        id: "2",
        userId: amo1Ctx.userId,
        gameCenterId: gc.id,
        position: 2,
      });
      const amo2Ctx = await createMockContext();
      await createArcadeMachine({
        id: "3",
        userId: amo2Ctx.userId,
        gameCenterId: gc.id,
        position: 3,
      });

      // uninstall予定日を取得
      const uninstallDate = dayjs()
        .tz(TERM_TIME_ZONE)
        .add(1, "day")
        .startOf("day")
        .toISOString();

      await notifyStopRentingReserve(ctx.userId!, gc.id);
      expect(await prisma.notification.count({})).toBe(3);
      const gcoNotifications = await prisma.notification.findMany({
        where: { userId: ctx.userId },
      });
      expect(gcoNotifications).toHaveLength(1);
      const gcoNotification = gcoNotifications[0];
      expect(gcoNotification).toMatchObject({
        userId: ctx.userId,
        notificationType: NotificationType.INFORMATION,
        tokenId: gc.id,
        nftType: NftType.GAME_CENTER,
      });
      const parsed = Information_GcStopRentingReserveForGCO.parse(
        gcoNotification.messageJson,
      );
      expect(parsed).toEqual({
        gameCenterId: gc.id,
        messageId: "I00004",
        stopRentingDate: uninstallDate,
      });

      const amo1Notifications = await prisma.notification.findMany({
        where: { userId: amo1Ctx.userId },
      });
      expect(amo1Notifications).toHaveLength(1);
      const amo1Notification = amo1Notifications[0];
      expect(amo1Notification).toMatchObject({
        userId: amo1Ctx.userId,
        notificationType: NotificationType.INFORMATION,
        tokenId: null,
        nftType: NftType.ARCADE_MACHINE,
      });
      const parsedAmo1 = Information_GcStopRentingReserveForAMO.parse(
        amo1Notification.messageJson,
      );
      expect(parsedAmo1).toEqual({
        gameCenterId: gc.id,
        messageId: "I00005",
        stopRentingDate: uninstallDate,
      });
      const amo2Notifications = await prisma.notification.findMany({
        where: { userId: amo2Ctx.userId },
      });
      expect(amo2Notifications).toHaveLength(1);
      const amo2Notification = amo2Notifications[0];
      expect(amo2Notification).toMatchObject({
        userId: amo2Ctx.userId,
        notificationType: NotificationType.INFORMATION,
        tokenId: null,
        nftType: NftType.ARCADE_MACHINE,
      });
      const parsedAmo2 = Information_GcStopRentingReserveForAMO.parse(
        amo2Notification.messageJson,
      );
      expect(parsedAmo2).toEqual({
        gameCenterId: gc.id,
        messageId: "I00005",
        stopRentingDate: uninstallDate,
      });
    });
  });
  describe("募集停止/AM自動撤去", () => {
    test("success", async () => {
      const amo1Ctx = await createMockContext();
      const amo2Ctx = await createMockContext();
      const gcoCtx = await createMockContext();
      const items: arcadeMachineWithGameCenterOwnerId[] = [
        {
          id: "1",
          userId: amo1Ctx.userId!,
          gameCenter: {
            id: "gc1",
            userId: gcoCtx.userId!,
          },
        },
        {
          id: "2",
          userId: amo1Ctx.userId!,
          gameCenter: {
            id: "gc2",
            userId: gcoCtx.userId!,
          },
        },
        {
          id: "3",
          userId: amo2Ctx.userId!,
          gameCenter: {
            id: "gc2",
            userId: gcoCtx.userId!,
          },
        },
      ];
      await notifyAmUninstallBecauseStopRenting(items);
      // AMO向け3行 GCO向け2行
      expect(await prisma.notification.count({})).toBe(5);

      // GCO向け
      const gcoNotifications = await prisma.notification.findMany({
        where: { nftType: NftType.GAME_CENTER },
        orderBy: { tokenId: "asc" },
      });
      expect(gcoNotifications).toHaveLength(2);
      expect(gcoNotifications).toMatchObject([
        {
          userId: gcoCtx.userId,
          notificationType: NotificationType.INFORMATION,
          tokenId: "gc1",
          nftType: NftType.GAME_CENTER,
          messageJson: {
            gameCenterId: "gc1",
            messageId: "I00006",
          },
        },
        {
          userId: gcoCtx.userId,
          notificationType: NotificationType.INFORMATION,
          tokenId: "gc2",
          nftType: NftType.GAME_CENTER,
          messageJson: {
            gameCenterId: "gc2",
            messageId: "I00006",
          },
        },
      ]);
      for (const gcoNotification of gcoNotifications) {
        Information_GcStopRentingExecute.parse(gcoNotification.messageJson);
      }

      // AMO向け
      const amoNotifications = await prisma.notification.findMany({
        where: { nftType: NftType.ARCADE_MACHINE },
        orderBy: { tokenId: "asc" },
      });
      expect(amoNotifications).toHaveLength(3);
      expect(amoNotifications).toMatchObject([
        {
          userId: amo1Ctx.userId,
          notificationType: NotificationType.INFORMATION,
          tokenId: "1",
          nftType: NftType.ARCADE_MACHINE,
          messageJson: {
            arcadeMachineId: "1",
            gameCenterId: "gc1",
            messageId: "I00016",
          },
        },
        {
          userId: amo1Ctx.userId,
          notificationType: NotificationType.INFORMATION,
          tokenId: "2",
          nftType: NftType.ARCADE_MACHINE,
          messageJson: {
            arcadeMachineId: "2",
            gameCenterId: "gc2",
            messageId: "I00016",
          },
        },
        {
          userId: amo2Ctx.userId,
          notificationType: NotificationType.INFORMATION,
          tokenId: "3",
          nftType: NftType.ARCADE_MACHINE,

          messageJson: {
            arcadeMachineId: "3",
            gameCenterId: "gc2",
            messageId: "I00016",
          },
        },
      ]);
      for (const amoNotification of amoNotifications) {
        Information_AmUninstallBecauseStopRentingForAMO.parse(
          amoNotification.messageJson,
        );
      }
    });
  });
  describe("AMのDeposit", () => {
    test("success", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine({ userId: ctx.userId });
      await notifyAmDeposit(am.id);
      const notifications = await prisma.notification.findMany({});
      expect(notifications).toHaveLength(1);
      const notification = notifications[0];
      expect(notification).toMatchObject({
        userId: ctx.userId,
        notificationType: NotificationType.INFORMATION,
        tokenId: am.id,
        nftType: NftType.ARCADE_MACHINE,
        messageJson: {
          arcadeMachineId: am.id,
          messageId: "I00008",
        },
      });
      const parsed = Information_AmDeposit.parse(notification.messageJson);
      expect(parsed).toEqual({
        arcadeMachineId: am.id,
        messageId: "I00008",
      });
    });
  });
  describe("AMのWithdraw", () => {
    test("success", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine({ userId: ctx.userId });
      await notifyAmWithdraw(am.id);
      const notifications = await prisma.notification.findMany({});
      expect(notifications).toHaveLength(1);
      const notification = notifications[0];
      expect(notification).toMatchObject({
        userId: ctx.userId,
        notificationType: NotificationType.INFORMATION,
        tokenId: am.id,
        nftType: NftType.ARCADE_MACHINE,
        messageJson: {
          arcadeMachineId: am.id,
          messageId: "I00009",
        },
      });
      const parsed = Information_AmWithdraw.parse(notification.messageJson);
      expect(parsed).toEqual({
        arcadeMachineId: am.id,
        messageId: "I00009",
      });
    });
  });
  describe("AM設置", () => {
    test("success", async () => {
      const amoCtx = await createMockContext();
      const gcoCtx = await createMockContext();
      await notifyAmInstall(amoCtx.userId!, gcoCtx.userId!, "am1", "gc1");
      const notifications = await prisma.notification.findMany({
        orderBy: { tokenId: "asc" },
      });
      expect(notifications).toHaveLength(2);
      const amNotification = notifications[0];
      expect(amNotification).toMatchObject({
        userId: amoCtx.userId,
        notificationType: NotificationType.INFORMATION,
        tokenId: "am1",
        nftType: NftType.ARCADE_MACHINE,
        messageJson: {
          arcadeMachineId: "am1",
          gameCenterId: "gc1",
          messageId: "I00010",
        },
      });
      const parsedAm = Information_AmInstallForAMO.parse(
        amNotification.messageJson,
      );
      expect(parsedAm).toEqual({
        arcadeMachineId: "am1",
        gameCenterId: "gc1",
        messageId: "I00010",
      });
      const gcNotification = notifications[1];
      expect(gcNotification).toMatchObject({
        userId: gcoCtx.userId,
        notificationType: NotificationType.INFORMATION,
        tokenId: "gc1",
        nftType: NftType.GAME_CENTER,
        messageJson: {
          arcadeMachineId: "am1",
          gameCenterId: "gc1",
          messageId: "I00011",
        },
      });
      const parsedGc = Information_AmInstallForGCO.parse(
        gcNotification.messageJson,
      );
      expect(parsedGc).toEqual({
        arcadeMachineId: "am1",
        gameCenterId: "gc1",
        messageId: "I00011",
      });
    });
  });
  describe("AM手動撤去", () => {
    test("success", async () => {
      const amoCtx = await createMockContext();
      const gcoCtx = await createMockContext();
      await notifyAmUninstall(amoCtx.userId!, gcoCtx.userId!, "am1", "gc1");
      const notifications = await prisma.notification.findMany({
        orderBy: { tokenId: "asc" },
      });
      expect(notifications).toHaveLength(2);
      const amNotification = notifications[0];
      expect(amNotification).toMatchObject({
        userId: amoCtx.userId,
        notificationType: NotificationType.INFORMATION,
        tokenId: "am1",
        nftType: NftType.ARCADE_MACHINE,
        messageJson: {
          messageId: "I00012",
          arcadeMachineId: "am1",
          gameCenterId: "gc1",
        },
      });
      const gcNotification = notifications[1];
      expect(gcNotification).toMatchObject({
        userId: gcoCtx.userId,
        notificationType: NotificationType.INFORMATION,
        tokenId: "gc1",
        nftType: NftType.GAME_CENTER,
        messageJson: {
          messageId: "I00013",
          arcadeMachineId: "am1",
          gameCenterId: "gc1",
        },
      });
    });
  });
  describe("AM自然撤去", () => {
    test("success", async () => {
      const amo1Ctx = await createMockContext();
      const amo2Ctx = await createMockContext();
      const gcoCtx = await createMockContext();
      const items: arcadeMachineWithGameCenterOwnerId[] = [
        {
          id: "1",
          userId: amo1Ctx.userId!,
          gameCenter: {
            id: "gc1",
            userId: gcoCtx.userId!,
          },
        },
        {
          id: "2",
          userId: amo1Ctx.userId!,
          gameCenter: {
            id: "gc2",
            userId: gcoCtx.userId!,
          },
        },
        {
          id: "3",
          userId: amo2Ctx.userId!,
          gameCenter: {
            id: "gc2",
            userId: gcoCtx.userId!,
          },
        },
      ];
      await notifyAmUninstallBecauseAutoRenewDisabled(items);

      expect(await prisma.notification.count({})).toBe(6);

      // GCO向け
      const gcoNotifications = await prisma.notification.findMany({
        where: { nftType: NftType.GAME_CENTER },
        orderBy: { tokenId: "asc" },
      });
      const gcChecker = (
        notification: Notification,
        gcId: string,
        amId: string,
      ) => {
        expect(notification).toMatchObject({
          userId: gcoCtx.userId,
          notificationType: NotificationType.INFORMATION,
          nftType: NftType.GAME_CENTER,
          tokenId: gcId,
          messageJson: {
            messageId: "I00015",
            arcadeMachineId: amId,
            gameCenterId: gcId,
          },
        });
        const parsed =
          Information_AmUninstallBecauseAutoRenewDisabledForGCO.parse(
            notification.messageJson,
          );
        expect(parsed).toEqual({
          messageId: "I00015",
          arcadeMachineId: amId,
          gameCenterId: gcId,
        });
      };
      expect(gcoNotifications).toHaveLength(3);
      gcChecker(gcoNotifications[0], "gc1", "1");
      gcChecker(gcoNotifications[1], "gc2", "2");
      gcChecker(gcoNotifications[2], "gc2", "3");

      // AMO向け
      const amoNotifications = await prisma.notification.findMany({
        where: { nftType: NftType.ARCADE_MACHINE },
        orderBy: { tokenId: "asc" },
      });
      expect(amoNotifications).toHaveLength(3);
      const amChecker = (
        notification: Notification,
        amoId: string,
        gcId: string,
        amId: string,
      ) => {
        expect(notification).toMatchObject({
          userId: amoId,
          notificationType: NotificationType.INFORMATION,
          nftType: NftType.ARCADE_MACHINE,
          tokenId: amId,
          messageJson: {
            messageId: "I00014",
            arcadeMachineId: amId,
            gameCenterId: gcId,
          },
        });
        const parsed =
          Information_AmUninstallBecauseAutoRenewDisabledForAMO.parse(
            notification.messageJson,
          );
        expect(parsed).toEqual({
          messageId: "I00014",
          arcadeMachineId: amId,
          gameCenterId: gcId,
        });
      };
      amChecker(amoNotifications[0], amo1Ctx.userId!, "gc1", "1");
      amChecker(amoNotifications[1], amo1Ctx.userId!, "gc2", "2");
      amChecker(amoNotifications[2], amo2Ctx.userId!, "gc2", "3");
    });
  });
  describe("APのDeposit", () => {
    test("success", async () => {
      const ctx = await createMockContext();
      const ap = await createArcadePart({ userId: ctx.userId });
      await notifyApDeposit(ap.id);

      const meta = getArcadePartMetadata(ap.category, ap.subCategory);

      const notifications = await prisma.notification.findMany({});
      expect(notifications).toHaveLength(1);
      const notification = notifications[0];
      expect(notification).toMatchObject({
        userId: ctx.userId,
        notificationType: NotificationType.INFORMATION,
        tokenId: ap.id,
        nftType: NftType.ARCADE_PART,
        messageJson: {
          name: meta.name,
          messageId: "I00019",
        },
      });
      const parsed = Information_ApDeposit.parse(notification.messageJson);
      expect(parsed).toEqual({
        name: meta.name,
        messageId: "I00019",
      });
    });
  });
  describe("APのWithdraw", () => {
    test("success", async () => {
      const ctx = await createMockContext();
      const ap = await createArcadePart({ userId: ctx.userId });
      await notifyApWithdraw(ap.id);
      const meta = getArcadePartMetadata(ap.category, ap.subCategory);

      const notifications = await prisma.notification.findMany({});
      expect(notifications).toHaveLength(1);
      const notification = notifications[0];
      expect(notification).toMatchObject({
        userId: ctx.userId,
        notificationType: NotificationType.INFORMATION,
        tokenId: ap.id,
        nftType: NftType.ARCADE_PART,
        messageJson: {
          name: meta.name,
          messageId: "I00020",
        },
      });
      const parsed = Information_ApWithdraw.parse(notification.messageJson);
      expect(parsed).toEqual({
        name: meta.name,
        messageId: "I00020",
      });
    });
  });
  describe("Craft", () => {
    test("success", async () => {
      const ctx = await createMockContext();
      await notifyCraft(ctx.userId!, "1");
      const notifications = await prisma.notification.findMany({
        orderBy: { notificationType: "asc" },
      });
      expect(notifications).toHaveLength(2);
      const activity = notifications[0];
      expect(activity).toMatchObject({
        userId: ctx.userId,
        notificationType: NotificationType.ACTIVITY,
        tokenId: "1",
        nftType: NftType.ARCADE_MACHINE,
        messageJson: {
          id: "1",
          messageId: "A00001",
        },
      });
      const parsedActivity = Activity_Craft.parse(activity.messageJson);
      expect(parsedActivity).toEqual({
        id: "1",
        messageId: "A00001",
      });
      const information = notifications[1];
      expect(information).toMatchObject({
        userId: ctx.userId,
        notificationType: NotificationType.INFORMATION,
        tokenId: "1",
        nftType: NftType.ARCADE_MACHINE,
        messageJson: {
          arcadeMachineId: "1",
          messageId: "I00021",
        },
      });
      const parsedInformation = Information_Craft.parse(
        information.messageJson,
      );
      expect(parsedInformation).toEqual({
        arcadeMachineId: "1",
        messageId: "I00021",
      });
    });
  });
  describe("賃貸更新", () => {
    const dateStr = "20230331";
    describe("AMOから料金徴収", () => {
      test("success", async () => {
        const ctx = await createMockContext();
        const amoId = ctx.userId;
        const gcoCtx = await createMockContext();
        const gcoId = gcoCtx.userId;
        const noTargetAmoCtx = await createMockContext();
        const am1 = await createArcadeMachine({ id: "1", userId: amoId });
        const am2 = await createArcadeMachine({ id: "2", userId: amoId });
        const am3 = await createArcadeMachine({ id: "3", userId: amoId });
        const am4 = await createArcadeMachine({
          id: "4",
          userId: noTargetAmoCtx.userId,
        });

        await prisma.rentalFee.createMany({
          data: [
            {
              date: dateStr,
              arcadeMachineId: am1.id,
              arcadeMachineOwnerId: amoId!,
              gameCenterId: "gc1",
              gameCenterOwnerId: gcoId!,
              fee: 100,
              collectState: CollectState.COLLECTED,
            },
            {
              date: dateStr,
              arcadeMachineId: am2.id,
              arcadeMachineOwnerId: amoId!,
              gameCenterId: "gc2",
              gameCenterOwnerId: gcoId!,
              fee: 200,
              collectState: CollectState.COLLECTED,
            },
            {
              date: dateStr,
              arcadeMachineId: am3.id,
              arcadeMachineOwnerId: amoId!,
              gameCenterId: "gc1",
              gameCenterOwnerId: gcoId!,
              fee: 300,
              collectState: CollectState.UNINSTALLED,
            },
            {
              date: dateStr,
              arcadeMachineId: am4.id,
              arcadeMachineOwnerId: noTargetAmoCtx.userId!,
              gameCenterId: "gc1",
              gameCenterOwnerId: gcoId!,
              fee: 100,
              collectState: CollectState.COLLECTED,
            },
          ],
        });

        await notifyRentalFeeCollect(dateStr, ctx.userId!);
        const notifications = await prisma.notification.findMany();
        // サマリ1行 撤去1行
        expect(notifications).toHaveLength(2);
        const summary = notifications[0];
        expect(summary).toMatchObject({
          userId: ctx.userId,
          notificationType: NotificationType.INFORMATION,
          tokenId: null,
          nftType: NftType.ARCADE_MACHINE,
          messageJson: {
            messageId: "I00023",
            installedCount: 3,
            renewCount: 2,
            uninstallCount: 1,
          },
          messageDetailJson: {
            detailId: "I00023",
            summary: {
              messageId: "I00023-summary",
              installedCount: 3,
              renewCount: 2,
              uninstallCount: 1,
              sumFees: "300",
            },
            details: [
              {
                messageId: "I00023-success",
                arcadeMachineId: am1.id,
                gameCenterId: "gc1",
                fee: "100",
              },
              {
                messageId: "I00023-success",
                arcadeMachineId: am2.id,
                gameCenterId: "gc2",
                fee: "200",
              },
              {
                messageId: "I00023-fail",
                arcadeMachineId: am3.id,
                gameCenterId: "gc1",
              },
            ],
          },
        });
        const messageJsonParsed = Information_CollectRentalFee.parse(
          summary.messageJson,
        );
        expect(messageJsonParsed).toEqual({
          messageId: "I00023",
          installedCount: 3,
          renewCount: 2,
          uninstallCount: 1,
        });
        const messageDetailJsonParsed =
          Information_Detail_CollectRentalFee.parse(summary.messageDetailJson);
        expect(messageDetailJsonParsed).toMatchObject({
          detailId: "I00023",
          summary: {
            messageId: "I00023-summary",
            installedCount: 3,
            renewCount: 2,
            uninstallCount: 1,
            sumFees: "300",
          },
          details: [
            {
              messageId: "I00023-success",
              arcadeMachineId: am1.id,
              gameCenterId: "gc1",
              fee: "100",
            },
            {
              messageId: "I00023-success",
              arcadeMachineId: am2.id,
              gameCenterId: "gc2",
              fee: "200",
            },
            {
              messageId: "I00023-fail",
              arcadeMachineId: am3.id,
              gameCenterId: "gc1",
            },
          ],
        });
        const uninstall = notifications[1];
        expect(uninstall).toMatchObject({
          userId: ctx.userId,
          notificationType: NotificationType.INFORMATION,
          tokenId: am3.id,
          nftType: NftType.ARCADE_MACHINE,
          messageJson: {
            messageId: "I00017",
            arcadeMachineId: am3.id,
            gameCenterId: "gc1",
          },
        });
        const uninstallParsed =
          Information_AmUninstallBecauseCouldNotPayTheRentalFeeForAMO.parse(
            uninstall.messageJson,
          );
        expect(uninstallParsed).toEqual({
          messageId: "I00017",
          arcadeMachineId: am3.id,
          gameCenterId: "gc1",
        });
      });
    });
    describe("GCOへ料金払い込み", () => {
      test("success", async () => {
        const amoCtx = await createMockContext();
        const amoId = amoCtx.userId;
        const gcoCtx = await createMockContext();
        const gcoId = gcoCtx.userId;
        await createGameCenter({
          id: "1",
          userId: gcoId!,
          xCoordinate: 1,
          yCoordinate: 2,
          placementAllowed: true,
        });
        await createGameCenter({
          id: "2",
          userId: gcoId!,
          xCoordinate: 1,
          yCoordinate: 2,
          placementAllowed: false,
        });

        const noTargetGcoCtx = await createMockContext();
        const am1 = await createArcadeMachine({ id: "1", userId: amoId });
        const am2 = await createArcadeMachine({ id: "2", userId: amoId });
        const am3 = await createArcadeMachine({ id: "3", userId: amoId });
        const am4 = await createArcadeMachine({
          id: "4",
          userId: amoId,
        });

        await prisma.rentalFee.createMany({
          data: [
            {
              date: dateStr,
              arcadeMachineId: am1.id,
              arcadeMachineOwnerId: amoId!,
              gameCenterId: "gc1",
              gameCenterOwnerId: gcoId!,
              fee: 100,
              collectState: CollectState.COLLECTED,
              paymentState: PaymentState.PAID,
            },
            {
              date: dateStr,
              arcadeMachineId: am2.id,
              arcadeMachineOwnerId: amoId!,
              gameCenterId: "gc1",
              gameCenterOwnerId: gcoId!,
              fee: 200,
              collectState: CollectState.UNINSTALLED,
              paymentState: PaymentState.UNPROCESSED,
            },
            {
              date: dateStr,
              arcadeMachineId: am3.id,
              arcadeMachineOwnerId: amoId!,
              gameCenterId: "gc2",
              gameCenterOwnerId: gcoId!,
              fee: 300,
              collectState: CollectState.COLLECTED,
              paymentState: PaymentState.PAID,
            },
            {
              date: dateStr,
              arcadeMachineId: am4.id,
              arcadeMachineOwnerId: amoId!,
              gameCenterId: "gc1",
              gameCenterOwnerId: noTargetGcoCtx.userId!,
              fee: 100,
              collectState: CollectState.COLLECTED,
              paymentState: PaymentState.PAID,
            },
          ],
        });
        await notifyRentalFeePayment(dateStr, gcoId!);
        const notifications = await prisma.notification.findMany({});
        expect(notifications).toHaveLength(2);
        // サマリ1行 撤去1行
        expect(notifications).toHaveLength(2);
        const summary = notifications[0];
        expect(summary).toMatchObject({
          userId: gcoId,
          notificationType: NotificationType.INFORMATION,
          tokenId: null,
          nftType: NftType.GAME_CENTER,
          messageJson: {
            messageId: "I00022",
            inOperationGcCount: 1,
            installedCount: 3,
            renewCount: 2,
            uninstallCount: 1,
          },
          messageDetailJson: {
            detailId: "I00022",
            summary: {
              messageId: "I00022-summary",
              installedCount: 3,
              renewCount: 2,
              uninstallCount: 1,
              sumFees: "400",
            },
            details: [
              {
                messageId: "I00022-success",
                arcadeMachineId: am1.id,
                gameCenterId: "gc1",
                fee: "100",
              },
              {
                messageId: "I00022-fail",
                arcadeMachineId: am2.id,
                gameCenterId: "gc1",
              },
              {
                messageId: "I00022-success",
                arcadeMachineId: am3.id,
                gameCenterId: "gc2",
                fee: "300",
              },
            ],
          },
        });
        const messageJsonParsed = Information_PaymentRentalFee.parse(
          summary.messageJson,
        );
        expect(messageJsonParsed).toEqual({
          messageId: "I00022",
          inOperationGcCount: 1,
          installedCount: 3,
          renewCount: 2,
          uninstallCount: 1,
        });
        const messageDetailJsonParsed =
          Information_Detail_PaymentRentalFee.parse(summary.messageDetailJson);
        expect(messageDetailJsonParsed).toMatchObject({
          detailId: "I00022",
          summary: {
            messageId: "I00022-summary",
            installedCount: 3,
            renewCount: 2,
            uninstallCount: 1,
            sumFees: "400",
          },
          details: [
            {
              messageId: "I00022-success",
              arcadeMachineId: am1.id,
              gameCenterId: "gc1",
              fee: "100",
            },
            {
              messageId: "I00022-fail",
              arcadeMachineId: am2.id,
              gameCenterId: "gc1",
            },
            {
              messageId: "I00022-success",
              arcadeMachineId: am3.id,
              gameCenterId: "gc2",
              fee: "300",
            },
          ],
        });
        const uninstall = notifications[1];
        expect(uninstall).toMatchObject({
          userId: gcoId,
          notificationType: NotificationType.INFORMATION,
          tokenId: am2.id,
          nftType: NftType.GAME_CENTER,
          messageJson: {
            messageId: "I00018",
            arcadeMachineId: am2.id,
            gameCenterId: "gc1",
          },
        });
        const uninstallParsed =
          Information_AmUninstallBecauseCouldNotPayTheRentalFeeForGCO.parse(
            uninstall.messageJson,
          );
        expect(uninstallParsed).toEqual({
          messageId: "I00018",
          arcadeMachineId: am2.id,
          gameCenterId: "gc1",
        });
      });
    });
  });
});
