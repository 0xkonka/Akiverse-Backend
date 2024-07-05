import {
  Information_GcDeposit,
  Information_GcWithdraw,
  Information_GcRentOut,
  Information_GcStopRentingReserveForGCO,
  Information_GcStopRentingReserveForAMO,
  Information_AmDeposit,
  Information_AmWithdraw,
  Information_AmInstallForAMO,
  Information_AmInstallForGCO,
  Information_AmUninstallForAMO,
  Information_AmUninstallForGCO,
  Information_AmUninstallBecauseAutoRenewDisabledForAMO,
  Information_AmUninstallBecauseAutoRenewDisabledForGCO,
  Information_AmUninstallBecauseStopRentingForAMO,
  Information_GcStopRentingExecute,
  Information_ApDeposit,
  Information_ApWithdraw,
  Information_Craft,
  Activity_Craft,
  PaymentRentalFee_Detail,
  Information_AmUninstallBecauseCouldNotPayTheRentalFeeForAMO,
  CollectRentalFee_Detail,
  Information_CollectRentalFee,
  Information_Detail_CollectRentalFee,
  Information_AmUninstallBecauseCouldNotPayTheRentalFeeForGCO,
  Information_PaymentRentalFee,
  Information_Detail_PaymentRentalFee,
  Activity_Mega_Spark_Player,
  Activity_Mega_Spark_AMO,
  Information_Mega_Spark_Upcoming_Player,
  Information_Mega_Spark_Upcoming_AMO,
  Information_Mega_Spark_Player,
  Information_Mega_Spark_AMO,
  Information_Full_of_Energy,
} from "../models/external/event_message";
import {
  CollectState,
  NotificationType,
  NftType,
  PaymentState,
  Prisma,
} from "@prisma/client";
import prisma from "../prisma";
import dayjs from "dayjs";
import { TERM_TIME_ZONE } from "../constants";
import { error } from "../utils";
import { getArcadePartMetadata } from "../metadata/arcade-parts";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(timezone);
dayjs.extend(utc);

export async function notifyGcDeposit(tokenId: string): Promise<void> {
  try {
    const gc = await prisma.gameCenter.findUniqueOrThrow({
      where: { id: tokenId },
    });
    if (!gc.userId) {
      return;
    }
    const messageObj: Information_GcDeposit = {
      messageId: "I00001",
      gameCenterId: tokenId,
    };

    await prisma.notification.create({
      data: {
        userId: gc.userId,
        notificationType: NotificationType.INFORMATION,
        nftType: NftType.GAME_CENTER,
        tokenId: tokenId,
        messageJson: messageObj,
      },
    });
  } catch (e) {
    error({ err: e });
  }
}

export async function notifyGcWithdraw(tokenId: string): Promise<void> {
  try {
    const gc = await prisma.gameCenter.findUniqueOrThrow({
      where: { id: tokenId },
    });
    if (!gc.userId) {
      return;
    }
    const messageObj: Information_GcWithdraw = {
      messageId: "I00002",
      gameCenterId: tokenId,
    };

    await prisma.notification.create({
      data: {
        userId: gc.userId,
        notificationType: NotificationType.INFORMATION,
        nftType: NftType.GAME_CENTER,
        tokenId: tokenId,
        messageJson: messageObj,
      },
    });
  } catch (e) {
    error({ err: e });
  }
}

export async function notifyStartRentOut(
  userId: string,
  gameCenterId: string,
): Promise<void> {
  try {
    const messageObj: Information_GcRentOut = {
      messageId: "I00003",
      gameCenterId: gameCenterId,
    };

    await prisma.notification.create({
      data: {
        userId: userId,
        notificationType: NotificationType.INFORMATION,
        nftType: NftType.GAME_CENTER,
        tokenId: gameCenterId,
        messageJson: messageObj,
      },
    });
  } catch (e) {
    error({ err: e });
  }
}

export async function notifyStopRentingReserve(
  userId: string,
  gameCenterId: string,
): Promise<void> {
  try {
    // タームのタイムゾーン基準で翌日0時(当日24時)
    const stopRentingDate = dayjs()
      .tz(TERM_TIME_ZONE)
      .add(1, "day")
      .startOf("day")
      .toISOString();

    const messageObj: Information_GcStopRentingReserveForGCO = {
      messageId: "I00004",
      gameCenterId: gameCenterId,
      stopRentingDate: stopRentingDate,
    };
    const gcoNotification = {
      userId: userId,
      notificationType: NotificationType.INFORMATION,
      nftType: NftType.GAME_CENTER,
      tokenId: gameCenterId,
      messageJson: messageObj,
    };

    // GCから紐づいているAM一覧を取得してAMO向けにも通知する
    const arcadeMachineOwners = await prisma.arcadeMachine.findMany({
      where: { gameCenterId: gameCenterId, userId: { not: null } },
      select: {
        userId: true,
      },
      distinct: ["userId"],
    });
    const amoNotifications = [];
    const amoMessageObj: Information_GcStopRentingReserveForAMO = {
      messageId: "I00005",
      gameCenterId: gameCenterId,
      stopRentingDate: stopRentingDate,
    };
    for (const arcadeMachine of arcadeMachineOwners) {
      amoNotifications.push({
        userId: arcadeMachine.userId!,
        notificationType: NotificationType.INFORMATION,
        nftType: NftType.ARCADE_MACHINE,
        tokenId: null,
        messageJson: amoMessageObj,
      });
    }
    await prisma.notification.createMany({
      data: [gcoNotification, ...amoNotifications],
    });
  } catch (e) {
    error({ err: e });
  }
}

export async function notifyAmDeposit(tokenId: string): Promise<void> {
  try {
    const am = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: tokenId },
    });
    if (!am.userId) {
      return;
    }
    const messageObj: Information_AmDeposit = {
      messageId: "I00008",
      arcadeMachineId: tokenId,
    };

    await prisma.notification.create({
      data: {
        userId: am.userId,
        notificationType: NotificationType.INFORMATION,
        nftType: NftType.ARCADE_MACHINE,
        tokenId: tokenId,
        messageJson: messageObj,
      },
    });
  } catch (e) {
    error({ err: e });
  }
}

export async function notifyAmWithdraw(tokenId: string): Promise<void> {
  try {
    const am = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: tokenId },
    });
    if (!am.userId) {
      return;
    }
    const messageObj: Information_AmWithdraw = {
      messageId: "I00009",
      arcadeMachineId: tokenId,
    };

    await prisma.notification.create({
      data: {
        userId: am.userId,
        notificationType: NotificationType.INFORMATION,
        nftType: NftType.ARCADE_MACHINE,
        tokenId: tokenId,
        messageJson: messageObj,
      },
    });
  } catch (e) {
    error({ err: e });
  }
}

export async function notifyAmInstall(
  amOwnerId: string,
  gcOwnerId: string,
  arcadeMachineId: string,
  gameCenterId: string,
): Promise<void> {
  try {
    const common = {
      gameCenterId: gameCenterId,
      arcadeMachineId: arcadeMachineId,
    };
    const amoMessageObj: Information_AmInstallForAMO = {
      messageId: "I00010",
      ...common,
    };
    const amoNotification = {
      userId: amOwnerId,
      tokenId: arcadeMachineId,
      notificationType: NotificationType.INFORMATION,
      nftType: NftType.ARCADE_MACHINE,
      messageJson: amoMessageObj,
    };
    const gcoMessageObj: Information_AmInstallForGCO = {
      messageId: "I00011",
      ...common,
    };
    const gcoNotification = {
      userId: gcOwnerId,
      tokenId: gameCenterId,
      notificationType: NotificationType.INFORMATION,
      nftType: NftType.GAME_CENTER,
      messageJson: gcoMessageObj,
    };
    await prisma.notification.createMany({
      data: [amoNotification, gcoNotification],
    });
  } catch (e) {
    error({ err: e });
  }
}

export async function notifyAmUninstall(
  amOwnerId: string,
  gcOwnerId: string,
  arcadeMachineId: string,
  gameCenterId: string,
): Promise<void> {
  try {
    const common = {
      gameCenterId: gameCenterId,
      arcadeMachineId: arcadeMachineId,
    };
    const amoMessageObj: Information_AmUninstallForAMO = {
      messageId: "I00012",
      ...common,
    };
    const amoNotification = {
      userId: amOwnerId,
      tokenId: arcadeMachineId,
      notificationType: NotificationType.INFORMATION,
      nftType: NftType.ARCADE_MACHINE,
      messageJson: amoMessageObj,
    };
    const gcoMessageObj: Information_AmUninstallForGCO = {
      messageId: "I00013",
      ...common,
    };
    const gcoNotification = {
      userId: gcOwnerId,
      tokenId: gameCenterId,
      notificationType: NotificationType.INFORMATION,
      nftType: NftType.GAME_CENTER,
      messageJson: gcoMessageObj,
    };
    await prisma.notification.createMany({
      data: [amoNotification, gcoNotification],
    });
  } catch (e) {
    error({ err: e });
  }
}

type ArcadeMachineWithGameCenterOwnerId = {
  id: string;
  userId: string | null;
  gameCenter: {
    id: string;
    userId: string | null;
  } | null;
};
export async function notifyAmUninstallBecauseAutoRenewDisabled(
  items: ArcadeMachineWithGameCenterOwnerId[],
): Promise<void> {
  try {
    const notifications = [];
    for (const item of items) {
      if (item.gameCenter && item.gameCenter.userId) {
        const common = {
          arcadeMachineId: item.id,
          gameCenterId: item.gameCenter.id,
        };
        const amoMessageObj: Information_AmUninstallBecauseAutoRenewDisabledForAMO =
          {
            messageId: "I00014",
            ...common,
          };
        const gcoMessageObj: Information_AmUninstallBecauseAutoRenewDisabledForGCO =
          {
            messageId: "I00015",
            ...common,
          };
        // AMO
        notifications.push({
          userId: item.userId!,
          notificationType: NotificationType.INFORMATION,
          nftType: NftType.ARCADE_MACHINE,
          tokenId: item.id,
          messageJson: amoMessageObj,
        });
        // GCO
        notifications.push({
          userId: item.gameCenter.userId!,
          notificationType: NotificationType.INFORMATION,
          nftType: NftType.GAME_CENTER,
          tokenId: item.gameCenter.id,
          messageJson: gcoMessageObj,
        });
      }
    }
    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }
  } catch (e) {
    error({ err: e });
  }
}

type OwnerAndTokenId = {
  ownerId: string;
  tokenId: string;
};
export async function notifyAmUninstallBecauseStopRenting(
  items: ArcadeMachineWithGameCenterOwnerId[],
): Promise<void> {
  try {
    // key = gameCenterId
    const gcMap = new Map<string, OwnerAndTokenId>();

    const notifications = [];
    for (const item of items) {
      if (item.gameCenter && item.gameCenter.userId) {
        if (!gcMap.has(item.gameCenter.id)) {
          // GC一覧を作成
          gcMap.set(item.gameCenter.id, {
            ownerId: item.gameCenter.userId,
            tokenId: item.gameCenter.id,
          });
        }
        const messageObj: Information_AmUninstallBecauseStopRentingForAMO = {
          messageId: "I00016",
          arcadeMachineId: item.id,
          gameCenterId: item.gameCenter.id,
        };
        notifications.push({
          userId: item.userId!,
          notificationType: NotificationType.INFORMATION,
          nftType: NftType.ARCADE_MACHINE,
          tokenId: item.id,
          messageJson: messageObj,
        });
      }
    }

    for (const item of gcMap.values()) {
      const messageObj: Information_GcStopRentingExecute = {
        messageId: "I00006",
        gameCenterId: item.tokenId,
      };
      notifications.push({
        userId: item.ownerId,
        notificationType: NotificationType.INFORMATION,
        nftType: NftType.GAME_CENTER,
        tokenId: item.tokenId,
        messageJson: messageObj,
      });
    }
    await prisma.notification.createMany({
      data: notifications,
    });
  } catch (e) {
    error({ err: e });
  }
}

export async function notifyApDeposit(tokenId: string): Promise<void> {
  try {
    const ap = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: tokenId },
    });
    if (!ap.userId) {
      return;
    }
    const metadata = getArcadePartMetadata(ap.category, ap.subCategory);
    const messageObj: Information_ApDeposit = {
      messageId: "I00019",
      name: metadata.name!,
    };

    await prisma.notification.create({
      data: {
        userId: ap.userId,
        notificationType: NotificationType.INFORMATION,
        nftType: NftType.ARCADE_PART,
        tokenId: tokenId,
        messageJson: messageObj,
      },
    });
  } catch (e) {
    error({ err: e });
  }
}

export async function notifyApWithdraw(tokenId: string): Promise<void> {
  try {
    const ap = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: tokenId },
    });
    if (!ap.userId) {
      return;
    }
    const metadata = getArcadePartMetadata(ap.category, ap.subCategory);
    const messageObj: Information_ApWithdraw = {
      messageId: "I00020",
      name: metadata.name!,
    };

    await prisma.notification.create({
      data: {
        userId: ap.userId,
        notificationType: NotificationType.INFORMATION,
        nftType: NftType.ARCADE_PART,
        tokenId: tokenId,
        messageJson: messageObj,
      },
    });
  } catch (e) {
    error({ err: e });
  }
}

export async function notifyCraft(
  userId: string,
  arcadeMachineId: string,
): Promise<void> {
  try {
    const informationMessageObj: Information_Craft = {
      messageId: "I00021",
      arcadeMachineId: arcadeMachineId,
    };
    const information = {
      userId: userId,
      tokenId: arcadeMachineId,
      notificationType: NotificationType.INFORMATION,
      nftType: NftType.ARCADE_MACHINE,
      messageJson: informationMessageObj,
    };
    const activityMessageObj: Activity_Craft = {
      messageId: "A00001",
      id: arcadeMachineId,
    };
    const activity = {
      userId: userId,
      tokenId: arcadeMachineId,
      notificationType: NotificationType.ACTIVITY,
      nftType: NftType.ARCADE_MACHINE,
      messageJson: activityMessageObj,
    };
    await prisma.notification.createMany({ data: [information, activity] });
  } catch (e) {
    error({ err: e });
  }
}

export async function notifyRentalFeeCollect(
  date: string,
  userId: string,
): Promise<void> {
  try {
    // 処理対象日とユーザーIDを引数に、AMOのその日のレコードから処理する
    const rentalFees = await prisma.rentalFee.findMany({
      where: { date, arcadeMachineOwnerId: userId },
    });

    const installedCount = rentalFees.length;
    let successCount = 0;
    let uninstallCount = 0;
    let sumFees = new Prisma.Decimal(0);
    const details: CollectRentalFee_Detail[] = [];
    const uninstalls = [];

    for (const rentalFee of rentalFees) {
      if (rentalFee.collectState === CollectState.COLLECTED) {
        successCount++;
        sumFees = sumFees.add(rentalFee.fee);
        details.push({
          messageId: "I00023-success",
          arcadeMachineId: rentalFee.arcadeMachineId,
          gameCenterId: rentalFee.gameCenterId,
          fee: rentalFee.fee.toString(),
        });
      } else if (rentalFee.collectState === CollectState.UNINSTALLED) {
        uninstallCount++;
        details.push({
          messageId: "I00023-fail",
          arcadeMachineId: rentalFee.arcadeMachineId,
          gameCenterId: rentalFee.gameCenterId,
        });
        const jsonObj: Information_AmUninstallBecauseCouldNotPayTheRentalFeeForAMO =
          {
            messageId: "I00017",
            arcadeMachineId: rentalFee.arcadeMachineId,
            gameCenterId: rentalFee.gameCenterId,
          };
        uninstalls.push({
          userId: userId,
          nftType: NftType.ARCADE_MACHINE,
          notificationType: NotificationType.INFORMATION,
          tokenId: rentalFee.arcadeMachineId,
          messageJson: jsonObj,
        });
      }
    }

    const notificationMessageJson: Information_CollectRentalFee = {
      messageId: "I00023",
      installedCount: installedCount,
      renewCount: successCount,
      uninstallCount: uninstallCount,
    };

    const notificationDetailJson: Information_Detail_CollectRentalFee = {
      detailId: "I00023",
      summary: {
        ...notificationMessageJson,
        messageId: "I00023-summary",
        sumFees: sumFees.toString(),
      },
      details: details,
    };

    await prisma.notification.createMany({
      data: [
        // メイン
        {
          userId: userId,
          notificationType: NotificationType.INFORMATION,
          nftType: NftType.ARCADE_MACHINE,
          messageJson: notificationMessageJson,
          messageDetailJson: notificationDetailJson,
        },
        ...uninstalls,
      ],
    });
  } catch (e) {
    error({ err: e });
  }
}

export async function notifyRentalFeePayment(
  date: string,
  userId: string,
): Promise<void> {
  try {
    // 処理対象日を引数にGCO毎にメインメッセージの行+明細行をインサートする
    // 処理対象日とユーザーIDを引数に、AMOのその日のレコードから処理する
    const rentalFees = await prisma.rentalFee.findMany({
      where: { date, gameCenterOwnerId: userId },
    });

    const inOperationGcCount = await prisma.gameCenter.count({
      where: {
        userId: userId,
        placementAllowed: true,
      },
    });

    const installedCount = rentalFees.length;
    let successCount = 0;
    let uninstallCount = 0;
    let sumFees = new Prisma.Decimal(0);
    const details: PaymentRentalFee_Detail[] = [];
    const uninstalls = [];

    for (const rentalFee of rentalFees) {
      if (rentalFee.paymentState === PaymentState.PAID) {
        successCount++;
        sumFees = sumFees.add(rentalFee.fee);
        details.push({
          messageId: "I00022-success",
          arcadeMachineId: rentalFee.arcadeMachineId,
          gameCenterId: rentalFee.gameCenterId,
          fee: rentalFee.fee.toString(),
        });
      } else if (rentalFee.collectState === CollectState.UNINSTALLED) {
        // AMOから徴収できなかったAM分
        uninstallCount++;
        details.push({
          messageId: "I00022-fail",
          arcadeMachineId: rentalFee.arcadeMachineId,
          gameCenterId: rentalFee.gameCenterId,
        });
        const jsonObj: Information_AmUninstallBecauseCouldNotPayTheRentalFeeForGCO =
          {
            messageId: "I00018",
            arcadeMachineId: rentalFee.arcadeMachineId,
            gameCenterId: rentalFee.gameCenterId,
          };
        uninstalls.push({
          userId: userId,
          nftType: NftType.GAME_CENTER,
          notificationType: NotificationType.INFORMATION,
          tokenId: rentalFee.arcadeMachineId,
          messageJson: jsonObj,
        });
      }
    }
    const notificationMessageJson: Information_PaymentRentalFee = {
      messageId: "I00022",
      inOperationGcCount: inOperationGcCount,
      installedCount: installedCount,
      renewCount: successCount,
      uninstallCount: uninstallCount,
    };

    const notificationDetailJson: Information_Detail_PaymentRentalFee = {
      detailId: "I00022",
      summary: {
        ...notificationMessageJson,
        messageId: "I00022-summary",
        sumFees: sumFees.toString(),
      },
      details: details,
    };

    await prisma.notification.createMany({
      data: [
        // メイン
        {
          userId: userId,
          notificationType: NotificationType.INFORMATION,
          nftType: NftType.GAME_CENTER,
          messageJson: notificationMessageJson,
          messageDetailJson: notificationDetailJson,
        },
        ...uninstalls,
      ],
    });
  } catch (e) {
    error({ err: e });
  }
}

// TODO: GCOへの通知は今フェーズではやらない
export function notifyMegaSparkUpcomingQuery(
  arcadeMachineId: string,
  playerId: string,
  arcadeMachineOwnerId: string,
) {
  const informationMessagePlayerObj: Information_Mega_Spark_Upcoming_Player = {
    messageId: "I00024",
    arcadeMachineId: arcadeMachineId,
  };
  const informationPlayer = {
    userId: playerId,
    tokenId: arcadeMachineId,
    notificationType: NotificationType.INFORMATION,
    nftType: NftType.ARCADE_MACHINE,
    messageJson: informationMessagePlayerObj,
  };
  const informationMessageAmoObj: Information_Mega_Spark_Upcoming_AMO = {
    messageId: "I00025",
    arcadeMachineId: arcadeMachineId,
  };
  const informationOwner = {
    userId: arcadeMachineOwnerId,
    tokenId: arcadeMachineId,
    notificationType: NotificationType.INFORMATION,
    nftType: NftType.ARCADE_MACHINE,
    messageJson: informationMessageAmoObj,
  };
  return [informationPlayer, informationOwner];
}

// TODO: GCOへの通知は今フェーズでは一旦やらない
export function notifyMegaSparkQuery(
  arcadeMachineId: string,
  playerId: string,
  arcadeMachineOwnerId: string,
  totalMegaSpark: number,
) {
  const informationMessagePlayerObj: Information_Mega_Spark_Player = {
    messageId: "I00027",
    arcadeMachineId: arcadeMachineId,
  };
  const informationPlayer = {
    userId: playerId,
    tokenId: arcadeMachineId,
    notificationType: NotificationType.INFORMATION,
    nftType: NftType.ARCADE_MACHINE,
    messageJson: informationMessagePlayerObj,
  };
  const informationMessageAmoObj: Information_Mega_Spark_AMO = {
    messageId: "I00028",
    arcadeMachineId: arcadeMachineId,
  };
  const informationOwner = {
    userId: arcadeMachineOwnerId,
    tokenId: arcadeMachineId,
    notificationType: NotificationType.INFORMATION,
    nftType: NftType.ARCADE_MACHINE,
    messageJson: informationMessageAmoObj,
  };
  const informationMessageFullOfEnergyObj: Information_Full_of_Energy = {
    messageId: "I00030",
    arcadeMachineId: arcadeMachineId,
  };
  const informationFullOfEnergy = {
    userId: arcadeMachineOwnerId,
    tokenId: arcadeMachineId,
    notificationType: NotificationType.INFORMATION,
    nftType: NftType.ARCADE_MACHINE,
    messageJson: informationMessageFullOfEnergyObj,
  };

  const activityMessagePlayerObj: Activity_Mega_Spark_Player = {
    messageId: "A00002",
    totalMegaSpark,
  };
  const activityPlayer = {
    userId: playerId,
    tokenId: arcadeMachineId,
    notificationType: NotificationType.ACTIVITY,
    nftType: NftType.ARCADE_MACHINE,
    messageJson: activityMessagePlayerObj,
  };

  const activityMessageAmoObj: Activity_Mega_Spark_AMO = {
    messageId: "A00003",
  };
  const activityOwner = {
    userId: arcadeMachineOwnerId,
    tokenId: arcadeMachineId,
    notificationType: NotificationType.ACTIVITY,
    nftType: NftType.ARCADE_MACHINE,
    messageJson: activityMessageAmoObj,
  };
  return [
    informationPlayer,
    informationOwner,
    informationFullOfEnergy,
    activityPlayer,
    activityOwner,
  ];
}
