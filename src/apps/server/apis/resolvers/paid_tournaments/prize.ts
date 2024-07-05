import { Service } from "typedi";
import { Ctx, FieldResolver, Resolver, Root } from "type-graphql";
import { PrizeInfoOutput, RankPrize } from "./outputs/prize_info_output";
import { PaidTournament } from "@generated/type-graphql";
import { Context } from "../../../../../context";
import { Prisma, RewardItemType } from "@prisma/client";
import { calcPrizeTerasSummary } from "../../../../../helpers/paid_tournament";
import { floorDecimalToIntegerValue } from "../../../../../helpers/decimal";
import { findPrizeCalcSetting } from "../../../../../use_cases/paid_tournament_usecase";

@Service()
@Resolver(() => PaidTournament)
export default class PaidTournamentPrizeResolver {
  @FieldResolver(() => PrizeInfoOutput)
  async prizeInfo(@Root() paidTournament: PaidTournament, @Ctx() ctx: Context) {
    const entries = await ctx.prisma.paidTournament.findUniqueOrThrow({
      where: { id: paidTournament.id },
      select: {
        prizeTerasAmount: true,
        _count: {
          select: {
            entries: true,
          },
        },
      },
    });

    const entriesNum = entries._count.entries;
    const calcSetting = findPrizeCalcSetting(entriesNum);

    const prizeSum = calcPrizeTerasSummary(
      entriesNum,
      paidTournament.entryFeeTickets,
      calcSetting,
      paidTournament.prizeTerasAmount,
    );
    let winnerTeras;
    let first = true;
    const rankingPrize: RankPrize[] = [];
    let i = 0;
    for (const prizeRatio of calcSetting.prizeRatios) {
      i++;
      const teras = prizeSum.mul(prizeRatio.ratio);
      let floor = teras;
      // 参加者0人だと0になる可能性があるのでチェック
      if (teras.comparedTo(new Prisma.Decimal(10)) >= 0) {
        floor = floorDecimalToIntegerValue(teras, 1);
      }
      if (first) {
        // Winnerは表示時にわかるように別の項目としても返却するため保持しておく
        winnerTeras = floor;
        first = false;
      }
      const prizes = [];
      prizes.push({
        itemType: RewardItemType.TERAS,
        name: "Teras",
        amount: floor.toNumber(),
        category: null,
        subCategory: null,
        // 比率表現を%表現に変換して返す
        percentage: prizeRatio.ratio.mul(100).toNumber(),
      });
      // TODO Teras以外のPrizeを実装する時はここで配列に追加する
      rankingPrize.push({
        title: prizeRatio.title,
        order: i,
        prizes: prizes,
      });
    }

    return new PrizeInfoOutput(prizeSum, winnerTeras!, rankingPrize);
  }
}
