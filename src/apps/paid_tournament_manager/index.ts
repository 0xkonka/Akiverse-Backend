import { ContextImpl } from "../../context";
import prisma from "../../prisma";
import { PaidTournamentUseCaseImpl } from "../../use_cases/paid_tournament_usecase";
import dayjs from "dayjs";
import { redisClient } from "../../redis";
import { error, parseBoolean } from "../../utils";
import { globalLogger } from "../../logger";
import { QuestProgressChecker } from "../../helpers/quests";
import { PaidTournamentManagerUseCaseImpl } from "../../use_cases/paid_tournament_manager_usecase";

const questProgressChecker = new QuestProgressChecker();
const useCase = new PaidTournamentUseCaseImpl(questProgressChecker);
console.log(process.env.SPN_PAY_SANDBOX);
const managerUseCase = new PaidTournamentManagerUseCaseImpl(
  process.env.SPN_PAY_KEY || "",
  process.env.SPN_PAY_SECRET || "",
  parseBoolean(process.env.SPN_PAY_SANDBOX) || false,
);
async function savePaidTournamentResult(): Promise<void> {
  try {
    await redisClient.on("error", (err) => error(err)).connect();
    const ctx = new ContextImpl(prisma, {});
    const now = dayjs();
    ctx.log.info(
      `savePaidTournamentResult process start. ${now.toISOString()}`,
    );
    const tournaments = await ctx.prisma.paidTournament.findMany({
      where: {
        endAt: {
          lte: now.add(-1, "hour").toDate(),
        },
      },
    });
    for (const tournament of tournaments) {
      ctx.log.info(`start record tournament result[${tournament.id}]`);
      try {
        await useCase.recordResult(ctx, tournament.id);
      } catch (e: unknown) {
        ctx.log.error(e);
      }
      ctx.log.info(`end record tournament result[${tournament.id}]`);
    }
    ctx.log.info(`savePaidTournamentResult process end.`);
  } finally {
    await redisClient.disconnect();
  }
}

async function sendPrize(): Promise<void> {
  const ctx = new ContextImpl(prisma, {});
  const now = dayjs();
  ctx.log.info(`sendPrize process start. ${now.toISOString()}`);
  const paidTournaments = await prisma.paidTournament.findMany({
    where: {
      endAt: {
        // トナメ終了から24時間は賞金受取申請期間のため
        lte: now.add(-1, "day").toDate(),
      },
      prizeSent: false,
    },
  });
  for (const paidTournament of paidTournaments) {
    try {
      ctx.log.info(`start sendPrize process target: ${paidTournament.id}`);
      await managerUseCase.prizeSend(paidTournament.id);
      ctx.log.info("finish sendPrize");
    } catch (e: unknown) {
      globalLogger.error(e);
    }
  }
  ctx.log.info(`sendPrize process end.`);
}

async function main() {
  await savePaidTournamentResult();
  await sendPrize();
}

if (require.main === module) {
  main();
}
