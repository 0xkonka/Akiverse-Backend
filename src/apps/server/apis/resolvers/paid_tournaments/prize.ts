import { Service } from "typedi";
import { Ctx, FieldResolver, Resolver, Root } from "type-graphql";
import { PrizeInfoOutput, RankPrize } from "./outputs/prize_info_output";
import { PaidTournament } from "@generated/type-graphql";
import { Context } from "../../../../../context";
import { Prisma, RewardItemType } from "@prisma/client";
import { calcPrizeTerasSummary, calcPrizeTicketsSum } from "../../../../../helpers/paid_tournament";
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
        prizeTicketAmount: true,  // Add prizeTicketAmount here
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

    const ticketSum = calcPrizeTicketsSum(
      entriesNum,
      paidTournament.entryFeeTickets,
      calcSetting,
      paidTournament.prizeTicketAmount,
    );

    let winnerTeras, winnerTickets;
    let first = true;
    const rankingPrize: RankPrize[] = [];
    let i = 0;

    for (const prizeRatio of calcSetting.prizeRatios) {
      i++;
      const teras = prizeSum.mul(prizeRatio.ratio);
      const tickets = new Prisma.Decimal(ticketSum).mul(prizeRatio.ratio);

      let floorTeras = teras;
      let floorTickets = tickets;

      if (teras.comparedTo(new Prisma.Decimal(10)) >= 0) {
        floorTeras = floorDecimalToIntegerValue(teras, 1);
      }

      if (tickets.comparedTo(new Prisma.Decimal(10)) >= 0) {
        floorTickets = floorDecimalToIntegerValue(tickets, 1);
      }

      if (first) {
        winnerTeras = floorTeras;
        winnerTickets = floorTickets;
        first = false;
      }

      const prizes = [];
      prizes.push({
        itemType: RewardItemType.TERAS,
        name: "Teras",
        amount: floorTeras.toNumber(),
        category: null,
        subCategory: null,
        percentage: prizeRatio.ratio.mul(100).toNumber(),
      });

      prizes.push({
        itemType: RewardItemType.TICKET,  // Assuming RewardItemType has TICKET
        name: "Tickets",
        amount: floorTickets.toNumber(),
        category: null,
        subCategory: null,
        percentage: prizeRatio.ratio.mul(100).toNumber(),
      });

      rankingPrize.push({
        title: prizeRatio.title,
        order: i,
        prizes: prizes,
      });
    }

    return new PrizeInfoOutput(prizeSum, winnerTeras!, winnerTickets!, rankingPrize);
  }
}
