import { Context } from "../context";
import { TICKET_PER_TERAS_RATE } from "../constants";
import { Prisma } from "@prisma/client";
import { PrizeCalcSetting } from "../use_cases/paid_tournament_usecase";

export async function canExchangePrize(
  ctx: Context,
  endAt: Date,
  prizeTerasOnly: boolean,
): Promise<boolean> {
  // Terasのみの場合は賞金受け取り申請できない
  if (prizeTerasOnly) return false;

  if (!ctx.userId) {
    return false;
  }
  const ignore = await ctx.prisma.paidTournamentPrizeClaimIgnoreUser.findUnique(
    {
      where: {
        userId: ctx.userId,
      },
    },
  );
  if (ignore) {
    // 対象外ユーザーには出さない
    return false;
  }
  // EndAt後24時間だけ表示する
  const now = new Date();
  if (endAt < now) {
    const after24Hour = new Date(endAt);
    after24Hour.setHours(after24Hour.getHours() + 24);
    if (now < after24Hour) {
      return true;
    }
  }
  return false;
}

export function calcPrizeTerasSummary(
  entryCount: number,
  entryFeeOfTicket: number,
  prizeCalcSetting: PrizeCalcSetting,
  prizeTerasAmount?: Prisma.Decimal | null,
): Prisma.Decimal {
  const totalEntryFeeTeras =
    entryCount * entryFeeOfTicket * TICKET_PER_TERAS_RATE;
  // PaidTournamentに賞金が設定されていたらそれ加算
  const additionalPrize = prizeTerasAmount
    ? prizeTerasAmount
    : new Prisma.Decimal(0);
  return new Prisma.Decimal(totalEntryFeeTeras)
    .mul(prizeCalcSetting.prizePoolRatio)
    .add(additionalPrize);
}
