// このファイルはフロントにも反映されるのでlint無視のコメント追加、時期を見てバックエンドとフロント両方合わせて修正する
/* eslint-disable @typescript-eslint/naming-convention */

import { z } from "zod";

// GCのDeposit通知
export const Information_GcDeposit = z.object({
  messageId: z.literal("I00001"),
  gameCenterId: z.string(),
});
export type Information_GcDeposit = z.infer<typeof Information_GcDeposit>;

// GCのWithdraw通知
export const Information_GcWithdraw = z.object({
  messageId: z.literal("I00002"),
  gameCenterId: z.string(),
});
export type Information_GcWithdraw = z.infer<typeof Information_GcWithdraw>;

// GCへのAM設置募集を開始した
export const Information_GcRentOut = z.object({
  messageId: z.literal("I00003"),
  gameCenterId: z.string(),
});
export type Information_GcRentOut = z.infer<typeof Information_GcRentOut>;

export const Information_GcStopRentingReserveForGCO = z.object({
  messageId: z.literal("I00004"),
  gameCenterId: z.string(),
  stopRentingDate: z.string().datetime(),
});
export type Information_GcStopRentingReserveForGCO = z.infer<
  typeof Information_GcStopRentingReserveForGCO
>;

export const Information_GcStopRentingReserveForAMO = z.object({
  messageId: z.literal("I00005"),
  gameCenterId: z.string(),
  stopRentingDate: z.string().datetime(),
});
export type Information_GcStopRentingReserveForAMO = z.infer<
  typeof Information_GcStopRentingReserveForAMO
>;

export const Information_GcStopRentingExecute = z.object({
  messageId: z.literal("I00006"),
  gameCenterId: z.string(),
});
export type Information_GcStopRentingExecute = z.infer<
  typeof Information_GcStopRentingExecute
>;

// AMのDeposit通知
export const Information_AmDeposit = z.object({
  messageId: z.literal("I00008"),
  arcadeMachineId: z.string(),
});
export type Information_AmDeposit = z.infer<typeof Information_AmDeposit>;

// AMのWithdraw通知
export const Information_AmWithdraw = z.object({
  messageId: z.literal("I00009"),
  arcadeMachineId: z.string(),
});
export type Information_AmWithdraw = z.infer<typeof Information_AmWithdraw>;

export const Information_AmInstallForAMO = z.object({
  messageId: z.literal("I00010"),
  gameCenterId: z.string(),
  arcadeMachineId: z.string(),
});
export type Information_AmInstallForAMO = z.infer<
  typeof Information_AmInstallForAMO
>;

export const Information_AmInstallForGCO = z.object({
  messageId: z.literal("I00011"),
  gameCenterId: z.string(),
  arcadeMachineId: z.string(),
});
export type Information_AmInstallForGCO = z.infer<
  typeof Information_AmInstallForGCO
>;

export const Information_AmUninstallForAMO = z.object({
  messageId: z.literal("I00012"),
  arcadeMachineId: z.string(),
  gameCenterId: z.string(),
});
export type Information_AmUninstallForAMO = z.infer<
  typeof Information_AmUninstallForAMO
>;

export const Information_AmUninstallForGCO = z.object({
  messageId: z.literal("I00013"),
  arcadeMachineId: z.string(),
  gameCenterId: z.string(),
});
export type Information_AmUninstallForGCO = z.infer<
  typeof Information_AmUninstallForGCO
>;

export const Information_AmUninstallBecauseAutoRenewDisabledForAMO = z.object({
  messageId: z.literal("I00014"),
  arcadeMachineId: z.string(),
  gameCenterId: z.string(),
});
export type Information_AmUninstallBecauseAutoRenewDisabledForAMO = z.infer<
  typeof Information_AmUninstallBecauseAutoRenewDisabledForAMO
>;

export const Information_AmUninstallBecauseAutoRenewDisabledForGCO = z.object({
  messageId: z.literal("I00015"),
  arcadeMachineId: z.string(),
  gameCenterId: z.string(),
});
export type Information_AmUninstallBecauseAutoRenewDisabledForGCO = z.infer<
  typeof Information_AmUninstallBecauseAutoRenewDisabledForGCO
>;

export const Information_AmUninstallBecauseStopRentingForAMO = z.object({
  messageId: z.literal("I00016"),
  arcadeMachineId: z.string(),
  gameCenterId: z.string(),
});
export type Information_AmUninstallBecauseStopRentingForAMO = z.infer<
  typeof Information_AmUninstallBecauseStopRentingForAMO
>;

export const Information_AmUninstallBecauseCouldNotPayTheRentalFeeForAMO =
  z.object({
    messageId: z.literal("I00017"),
    arcadeMachineId: z.string(),
    gameCenterId: z.string(),
  });
export type Information_AmUninstallBecauseCouldNotPayTheRentalFeeForAMO =
  z.infer<typeof Information_AmUninstallBecauseCouldNotPayTheRentalFeeForAMO>;

export const Information_AmUninstallBecauseCouldNotPayTheRentalFeeForGCO =
  z.object({
    messageId: z.literal("I00018"),
    arcadeMachineId: z.string(),
    gameCenterId: z.string(),
  });
export type Information_AmUninstallBecauseCouldNotPayTheRentalFeeForGCO =
  z.infer<typeof Information_AmUninstallBecauseCouldNotPayTheRentalFeeForGCO>;

// APのDeposit通知
export const Information_ApDeposit = z.object({
  messageId: z.literal("I00019"),
  name: z.string(),
});
export type Information_ApDeposit = z.infer<typeof Information_ApDeposit>;

// APのWithdraw通知
export const Information_ApWithdraw = z.object({
  messageId: z.literal("I00020"),
  name: z.string(),
});
export type Information_ApWithdraw = z.infer<typeof Information_ApWithdraw>;

export const Information_Craft = z.object({
  messageId: z.literal("I00021"),
  arcadeMachineId: z.string(),
});
export type Information_Craft = z.infer<typeof Information_Craft>;

export const Information_PaymentRentalFee = z.object({
  messageId: z.literal("I00022"),
  inOperationGcCount: z.number(),
  installedCount: z.number(),
  renewCount: z.number(),
  uninstallCount: z.number(),
});
export type Information_PaymentRentalFee = z.infer<
  typeof Information_PaymentRentalFee
>;

export const Information_CollectRentalFee = z.object({
  messageId: z.literal("I00023"),
  installedCount: z.number(),
  renewCount: z.number(),
  uninstallCount: z.number(),
});
export type Information_CollectRentalFee = z.infer<
  typeof Information_CollectRentalFee
>;

// MegaSpark Upcoming時の通知 Player
export const Information_Mega_Spark_Upcoming_Player = z.object({
  messageId: z.literal("I00024"),
  arcadeMachineId: z.string(),
});
export type Information_Mega_Spark_Upcoming_Player = z.infer<
  typeof Information_Mega_Spark_Upcoming_Player
>;

// MegaSpark Upcoming時の通知 AMO
export const Information_Mega_Spark_Upcoming_AMO = z.object({
  messageId: z.literal("I00025"),
  arcadeMachineId: z.string(),
});
export type Information_Mega_Spark_Upcoming_AMO = z.infer<
  typeof Information_Mega_Spark_Upcoming_AMO
>;

// MegaSpark Upcoming時の通知 GCO
export const Information_Mega_Spark_Upcoming_GCO = z.object({
  messageId: z.literal("I00026"),
  gameCenterId: z.string(),
});
export type Information_Mega_Spark_Upcoming_GCO = z.infer<
  typeof Information_Mega_Spark_Upcoming_GCO
>;

// MegaSpark時の通知 Player
export const Information_Mega_Spark_Player = z.object({
  messageId: z.literal("I00027"),
  arcadeMachineId: z.string(),
});
export type Information_Mega_Spark_Player = z.infer<
  typeof Information_Mega_Spark_Player
>;

// MegaSpark時の通知 AMO
export const Information_Mega_Spark_AMO = z.object({
  messageId: z.literal("I00028"),
  arcadeMachineId: z.string(),
});
export type Information_Mega_Spark_AMO = z.infer<
  typeof Information_Mega_Spark_AMO
>;

// MegaSpark時の通知 GCO
export const Information_Mega_Spark_GCO = z.object({
  messageId: z.literal("I00029"),
  gameCenterId: z.string(),
});
export type Information_Mega_Spark_GCO = z.infer<
  typeof Information_Mega_Spark_GCO
>;

// AMのEnergyがMAXになった時の通知
export const Information_Full_of_Energy = z.object({
  messageId: z.literal("I00030"),
  arcadeMachineId: z.string(),
});
export type Information_Full_of_Energy = z.infer<
  typeof Information_Full_of_Energy
>;

export const Activity_Craft = z.object({
  messageId: z.literal("A00001"),
  id: z.string(),
});
export type Activity_Craft = z.infer<typeof Activity_Craft>;

// MegaSpark時のActivity Player
export const Activity_Mega_Spark_Player = z.object({
  messageId: z.literal("A00002"),
  totalMegaSpark: z.number(),
});
export type Activity_Mega_Spark_Player = z.infer<
  typeof Activity_Mega_Spark_Player
>;

// MegaSpark時のActivity AMO
export const Activity_Mega_Spark_AMO = z.object({
  messageId: z.literal("A00003"),
});
export type Activity_Mega_Spark_AMO = z.infer<typeof Activity_Mega_Spark_AMO>;

// MegaSpark時のActivity GCO
export const Activity_Mega_Spark_GCO = z.object({
  messageId: z.literal("A00004"),
});
export type Activity_Mega_Spark_GCO = z.infer<typeof Activity_Mega_Spark_GCO>;

export const MessageSchema = z.union([
  Information_GcDeposit,
  Information_GcWithdraw,
  Information_GcRentOut,
  Information_GcStopRentingReserveForGCO,
  Information_GcStopRentingReserveForAMO,
  Information_GcStopRentingExecute,
  Information_AmDeposit,
  Information_AmWithdraw,
  Information_AmInstallForAMO,
  Information_AmInstallForGCO,
  Information_AmUninstallForAMO,
  Information_AmUninstallForGCO,
  Information_AmUninstallBecauseAutoRenewDisabledForAMO,
  Information_AmUninstallBecauseAutoRenewDisabledForGCO,
  Information_AmUninstallBecauseStopRentingForAMO,
  Information_AmUninstallBecauseCouldNotPayTheRentalFeeForAMO,
  Information_AmUninstallBecauseCouldNotPayTheRentalFeeForGCO,
  Information_ApDeposit,
  Information_ApWithdraw,
  Information_Craft,
  Information_PaymentRentalFee,
  Information_CollectRentalFee,
  Information_Mega_Spark_Upcoming_Player,
  Information_Mega_Spark_Upcoming_AMO,
  Information_Mega_Spark_Upcoming_GCO,
  Information_Mega_Spark_Player,
  Information_Mega_Spark_AMO,
  Information_Mega_Spark_GCO,
  Information_Full_of_Energy,
  Activity_Craft,
  Activity_Mega_Spark_Player,
  Activity_Mega_Spark_AMO,
  Activity_Mega_Spark_GCO,
]);
export type MessageSchemaType = z.infer<typeof MessageSchema>;

// GCへの賃料支払い サマリー
export const Information_Detail_PaymentRentalFee_Summary = z.object({
  messageId: z.literal("I00022-summary"),
  installedCount: z.number(),
  renewCount: z.number(),
  uninstallCount: z.number(),
  sumFees: z.string(),
});
export type Information_Detail_PaymentRentalFee_Summary = z.infer<
  typeof Information_Detail_PaymentRentalFee_Summary
>;

// GCへの賃料支払い 明細：成功
export const Information_Detail_PaymentRentalFee_Success = z.object({
  messageId: z.literal("I00022-success"),
  gameCenterId: z.string(),
  arcadeMachineId: z.string(),
  fee: z.string(),
});
export type Information_Detail_PaymentRentalFee_Success = z.infer<
  typeof Information_Detail_PaymentRentalFee_Success
>;

// GCへの賃料支払い 明細：失敗
export const Information_Detail_PaymentRentalFee_Fail = z.object({
  messageId: z.literal("I00022-fail"),
  gameCenterId: z.string(),
  arcadeMachineId: z.string(),
});
export type Information_Detail_PaymentRentalFee_Fail = z.infer<
  typeof Information_Detail_PaymentRentalFee_Fail
>;

// GCへの賃料支払い 明細
export const PaymentRentalFee_Detail = z.union([
  Information_Detail_PaymentRentalFee_Success,
  Information_Detail_PaymentRentalFee_Fail,
]);
export type PaymentRentalFee_Detail = z.infer<typeof PaymentRentalFee_Detail>;

// GCへの賃料支払い
export const Information_Detail_PaymentRentalFee = z.object({
  detailId: z.literal("I00022"),
  summary: Information_Detail_PaymentRentalFee_Summary,
  details: z.array(PaymentRentalFee_Detail).min(1),
});

export type Information_Detail_PaymentRentalFee = z.infer<
  typeof Information_Detail_PaymentRentalFee
>;

// AMO
// AMOへの賃料請求 サマリー
export const Information_Detail_CollectRentalFee_Summary = z.object({
  messageId: z.literal("I00023-summary"),
  installedCount: z.number(),
  renewCount: z.number(),
  uninstallCount: z.number(),
  sumFees: z.string(),
});
export type Information_Detail_CollectRentalFee_Summary = z.infer<
  typeof Information_Detail_CollectRentalFee_Summary
>;

// AMOへの賃料請求 明細：成功
export const Information_Detail_CollectRentalFee_Success = z.object({
  messageId: z.literal("I00023-success"),
  gameCenterId: z.string(),
  arcadeMachineId: z.string(),
  fee: z.string(),
});
export type Information_Detail_CollectRentalFee_Success = z.infer<
  typeof Information_Detail_CollectRentalFee_Success
>;

// AMOへの賃料請求 明細：失敗
export const Information_Detail_CollectRentalFee_Fail = z.object({
  messageId: z.literal("I00023-fail"),
  gameCenterId: z.string(),
  arcadeMachineId: z.string(),
});
export type Information_Detail_CollectRentalFee_Fail = z.infer<
  typeof Information_Detail_CollectRentalFee_Fail
>;

// AMOへの賃料請求 明細
export const CollectRentalFee_Detail = z.union([
  Information_Detail_CollectRentalFee_Success,
  Information_Detail_CollectRentalFee_Fail,
]);
export type CollectRentalFee_Detail = z.infer<typeof CollectRentalFee_Detail>;

// AMOへの賃料請求
export const Information_Detail_CollectRentalFee = z.object({
  detailId: z.literal("I00023"),
  summary: Information_Detail_CollectRentalFee_Summary,
  details: z.array(CollectRentalFee_Detail).min(1),
});

export type Information_Detail_CollectRentalFee = z.infer<
  typeof Information_Detail_CollectRentalFee
>;
