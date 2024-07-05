import { Context } from "../context";
import { BoosterMaster } from "@prisma/client";

export function writePurchaseTicketTransaction(
  ctx: Context,
  held: number,
  addCount: number,
  os: string,
  purchaseId: string,
) {
  return ctx.prisma.ticketTransaction.create({
    data: {
      userId: ctx.userId!,
      changeAmount: addCount,
      balance: held,
      transactionType: "PURCHASE",
      transactionDetail: JSON.stringify({
        os: os,
        purchaseId: purchaseId,
      }),
    },
  });
}

export function writeOpenQuestTransaction(
  ctx: Context,
  held: number,
  useCount: number,
  questChainId: string,
) {
  return ctx.prisma.ticketTransaction.create({
    data: {
      userId: ctx.userId!,
      changeAmount: useCount * -1,
      balance: held,
      transactionType: "OPEN_QUEST",
      transactionDetail: JSON.stringify({
        questChainId: questChainId,
      }),
    },
  });
}

export function writeEnterPaidTournamentTransaction(
  ctx: Context,
  held: number,
  useCount: number,
  tournamentId: string,
) {
  return ctx.prisma.ticketTransaction.create({
    data: {
      userId: ctx.userId!,
      changeAmount: useCount * -1,
      balance: held,
      transactionType: "ENTER_TOURNAMENT",
      transactionDetail: JSON.stringify({
        tournamentId: tournamentId,
      }),
    },
  });
}

export function writeTournamentBoosterTransaction(
  ctx: Context,
  held: number,
  boosterItem: BoosterMaster,
  tournamentId?: string,
) {
  return ctx.prisma.ticketTransaction.create({
    data: {
      userId: ctx.userId!,
      changeAmount: boosterItem.feeTickets * -1,
      balance: held,
      transactionType: "TOURNAMENT_BOOSTER",
      transactionDetail: JSON.stringify({
        tournamentId: tournamentId,
        category: boosterItem.category,
        subCategory: boosterItem.subCategory,
        variant: boosterItem.variant,
      }),
    },
  });
}
