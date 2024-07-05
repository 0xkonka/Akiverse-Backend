import { eraseDatabase } from "../test_helper";
import prisma from "../../src/prisma";
import { createMockContext } from "../mock/context";
import { BoosterItemUseCaseImpl } from "../../src/use_cases/booster_item_usecase";
import dayjs from "dayjs";
import {
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
} from "../../src/use_cases/errors";

const useCase = new BoosterItemUseCaseImpl();

describe("booster item usecase#apply", () => {
  async function createBoosterItemData() {
    await prisma.boosterMaster.createMany({
      data: [
        {
          id: "SPARK_TERAS_UP-X2-10M",
          feeTickets: 10,
          requireTournament: false,
          category: "SPARK_TERAS_UP",
          subCategory: "x2",
          variant: "10m",
          effectiveMinutes: 10,
        },
        {
          id: "SPARK_TERAS_UP-X2-15M",
          feeTickets: 15,
          requireTournament: false,
          category: "SPARK_TERAS_UP",
          subCategory: "x2",
          variant: "15m",
          effectiveMinutes: 15,
        },
        {
          id: "SPARK_TERAS_UP-X3-15M",
          feeTickets: 20,
          requireTournament: false,
          category: "SPARK_TERAS_UP",
          subCategory: "x3",
          variant: "15m",
          effectiveMinutes: 15,
        },
        {
          id: "GAME_SWAP-BUBBLE_ATTACK-ALL",
          feeTickets: 100,
          requireTournament: true,
          category: "GAME_SWAP",
          subCategory: "BUBBLE_ATTACK",
          variant: "ALL",
          effectiveMinutes: -1,
        },
        {
          id: "GAME_SWAP-BUBBLE_ATTACK-10M",
          feeTickets: 10,
          requireTournament: true,
          category: "GAME_SWAP",
          subCategory: "BUBBLE_ATTACK",
          variant: "10m",
          effectiveMinutes: 10,
        },
        {
          id: "GAME_SWAP-BUBBLE_ATTACK-15M",
          feeTickets: 15,
          requireTournament: true,
          category: "GAME_SWAP",
          subCategory: "BUBBLE_ATTACK",
          variant: "15m",
          effectiveMinutes: 15,
        },
        {
          id: "GAME_SWAP-MYTHIC_MATCH-ALL",
          feeTickets: 200,
          requireTournament: true,
          category: "GAME_SWAP",
          subCategory: "MYTHIC_MATCH",
          variant: "ALL",
          effectiveMinutes: -1,
        },
        {
          id: "GAME_SWAP-MYTHIC_MATCH-10M",
          feeTickets: 10,
          requireTournament: true,
          category: "GAME_SWAP",
          subCategory: "MYTHIC_MATCH",
          variant: "10m",
          effectiveMinutes: 10,
        },
        {
          id: "GAME_SWAP-MYTHIC_MATCH-15M",
          feeTickets: 15,
          requireTournament: true,
          category: "GAME_SWAP",
          subCategory: "MYTHIC_MATCH",
          variant: "15m",
          effectiveMinutes: 15,
        },
        {
          id: "EASY_MODE-ALL-10M",
          feeTickets: 1,
          category: "EASY_MODE",
          subCategory: "ALL",
          variant: "10m",
          effectiveMinutes: 10,
          requireTournament: false,
        },
        {
          id: "EASY_MODE-ALL-15M",
          feeTickets: 2,
          category: "EASY_MODE",
          subCategory: "ALL",
          variant: "15m",
          effectiveMinutes: 15,
          requireTournament: false,
        },
      ],
    });
  }
  beforeEach(async () => {
    await eraseDatabase();
    await createBoosterItemData();
  });
  test("TerasUp", async () => {
    const ctx = await createMockContext({
      tickets: 1000,
    });
    // 初回適用
    const firstApply = await useCase.apply(ctx, "SPARK_TERAS_UP-X2-10M");
    expect(firstApply).toMatchObject({
      userId: ctx.userId!,
      category: "SPARK_TERAS_UP",
      subCategory: "x2",
    });
    // DateをいじれないのでNowより未来であることをチェック
    expect(firstApply.endAt.getTime()).toBeGreaterThan(new Date().getTime());
    // 2回目の適用=効果時間延長
    const secondApply = await useCase.apply(ctx, "SPARK_TERAS_UP-X2-15M");
    expect(secondApply).toMatchObject({
      userId: ctx.userId!,
      category: "SPARK_TERAS_UP",
      subCategory: "x2",
      // 効果時間延長をチェック
      endAt: dayjs(firstApply.endAt).add(15, "minutes").toDate(),
    });
    // 別倍率のものを追加で購入できない
    await expect(useCase.apply(ctx, "SPARK_TERAS_UP-X3-15M")).rejects.toThrow(
      IllegalStateUseCaseError,
    );
    // 今有効なものが切れたら購入できる
    // x2を期限外に更新
    await ctx.prisma.activeBooster.update({
      data: {
        endAt: dayjs().add(-1, "minutes").toDate(),
      },
      where: {
        userId_category_subCategory: {
          userId: ctx.userId!,
          category: "SPARK_TERAS_UP",
          subCategory: "x2",
        },
      },
    });
    // x3を購入
    const x3Apply = await useCase.apply(ctx, "SPARK_TERAS_UP-X3-15M");
    expect(x3Apply).toMatchObject({
      userId: ctx.userId!,
      category: "SPARK_TERAS_UP",
      subCategory: "x3",
    });
    // DateをいじれないのでNowより未来であることをチェック
    expect(x3Apply.endAt.getTime()).toBeGreaterThan(new Date().getTime());
    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    expect(afterUser.tickets).toEqual(1000 - 10 - 15 - 20);
    const afterTransaction = await ctx.prisma.ticketTransaction.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });
    expect(afterTransaction).toHaveLength(3);
    expect(afterTransaction).toMatchObject([
      {
        userId: ctx.userId,
        changeAmount: -10,
        balance: 990,
        transactionType: "TOURNAMENT_BOOSTER",
        transactionDetail: JSON.stringify({
          category: "SPARK_TERAS_UP",
          subCategory: "x2",
          variant: "10m",
        }),
      },
      {
        userId: ctx.userId,
        changeAmount: -15,
        balance: 975,
        transactionType: "TOURNAMENT_BOOSTER",
        transactionDetail: JSON.stringify({
          category: "SPARK_TERAS_UP",
          subCategory: "x2",
          variant: "15m",
        }),
      },
      {
        userId: ctx.userId,
        changeAmount: -20,
        balance: 955,
        transactionType: "TOURNAMENT_BOOSTER",
        transactionDetail: JSON.stringify({
          category: "SPARK_TERAS_UP",
          subCategory: "x3",
          variant: "15m",
        }),
      },
    ]);
  });
  test("GameSwapper/all time", async () => {
    const ctx = await createMockContext({
      tickets: 1000,
    });
    const tournamentStartAt = dayjs();
    const tournamentEndAt = tournamentStartAt.add(1, "day");
    const pt = await ctx.prisma.paidTournament.create({
      data: {
        title: "ut",
        startAt: tournamentStartAt.toDate(),
        endAt: tournamentEndAt.toDate(),
        entryFeeTickets: 1,
        entries: {
          create: {
            userId: ctx.userId!,
            usedTickets: 1,
          },
        },
        paidTournamentBoosterAvailable: {
          createMany: {
            data: [
              {
                boosterMasterId: "GAME_SWAP-BUBBLE_ATTACK-10M",
              },
              {
                boosterMasterId: "GAME_SWAP-BUBBLE_ATTACK-15M",
              },
              {
                boosterMasterId: "GAME_SWAP-MYTHIC_MATCH-10M",
              },
              {
                boosterMasterId: "GAME_SWAP-BUBBLE_ATTACK-ALL",
              },
              {
                boosterMasterId: "GAME_SWAP-MYTHIC_MATCH-ALL",
              },
            ],
          },
        },
      },
    });
    const firstApply = await useCase.apply(
      ctx,
      "GAME_SWAP-BUBBLE_ATTACK-ALL",
      pt.id,
    );
    expect(firstApply).toMatchObject({
      userId: ctx.userId!,
      category: "GAME_SWAP",
      subCategory: "BUBBLE_ATTACK",
      endAt: tournamentEndAt.toDate(),
      paidTournamentId: pt.id,
    });

    // トナメ終了まで適用しているので追加購入できない
    await expect(
      useCase.apply(ctx, "GAME_SWAP-BUBBLE_ATTACK-10M", pt.id),
    ).rejects.toThrow(InvalidArgumentUseCaseError);

    // 違うゲームのものは購入できる
    const secondApply = await useCase.apply(
      ctx,
      "GAME_SWAP-MYTHIC_MATCH-ALL",
      pt.id,
    );
    expect(secondApply).toMatchObject({
      userId: ctx.userId!,
      category: "GAME_SWAP",
      subCategory: "MYTHIC_MATCH",
      endAt: tournamentEndAt.toDate(),
      paidTournamentId: pt.id,
    });
    // 違うトーナメントに対しては購入できる
    const otherPT = await ctx.prisma.paidTournament.create({
      data: {
        title: "ut",
        startAt: tournamentStartAt.toDate(),
        endAt: tournamentEndAt.toDate(),
        entryFeeTickets: 1,
        entries: {
          create: {
            userId: ctx.userId!,
            usedTickets: 1,
          },
        },
        paidTournamentBoosterAvailable: {
          createMany: {
            data: [
              {
                boosterMasterId: "GAME_SWAP-BUBBLE_ATTACK-10M",
              },
              {
                boosterMasterId: "GAME_SWAP-BUBBLE_ATTACK-15M",
              },
              {
                boosterMasterId: "GAME_SWAP-MYTHIC_MATCH-10M",
              },
              {
                boosterMasterId: "GAME_SWAP-BUBBLE_ATTACK-ALL",
              },
              {
                boosterMasterId: "GAME_SWAP-MYTHIC_MATCH-ALL",
              },
            ],
          },
        },
      },
    });
    const otherApply = await useCase.apply(
      ctx,
      "GAME_SWAP-BUBBLE_ATTACK-ALL",
      otherPT.id,
    );
    expect(otherApply).toMatchObject({
      userId: ctx.userId!,
      category: "GAME_SWAP",
      subCategory: "BUBBLE_ATTACK",
      endAt: tournamentEndAt.toDate(),
      paidTournamentId: otherPT.id,
    });

    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId! },
    });
    expect(afterUser.tickets).toEqual(1000 - 100 - 200 - 100);
    const afterTransactions = await ctx.prisma.ticketTransaction.findMany({
      orderBy: { createdAt: "asc" },
    });
    expect(afterTransactions).toHaveLength(3);
    expect(afterTransactions).toMatchObject([
      {
        userId: ctx.userId,
        changeAmount: -100,
        balance: 900,
        transactionType: "TOURNAMENT_BOOSTER",
        transactionDetail: JSON.stringify({
          tournamentId: pt.id,
          category: "GAME_SWAP",
          subCategory: "BUBBLE_ATTACK",
          variant: "ALL",
        }),
      },
      {
        userId: ctx.userId,
        changeAmount: -200,
        balance: 700,
        transactionType: "TOURNAMENT_BOOSTER",
        transactionDetail: JSON.stringify({
          tournamentId: pt.id,
          category: "GAME_SWAP",
          subCategory: "MYTHIC_MATCH",
          variant: "ALL",
        }),
      },
      {
        userId: ctx.userId,
        changeAmount: -100,
        balance: 600,
        transactionType: "TOURNAMENT_BOOSTER",
        transactionDetail: JSON.stringify({
          tournamentId: otherPT.id,
          category: "GAME_SWAP",
          subCategory: "BUBBLE_ATTACK",
          variant: "ALL",
        }),
      },
    ]);
  });
  test("GameSwapper/non all time", async () => {
    const ctx = await createMockContext({ tickets: 1000 });
    const tournamentStartAt = dayjs();
    const tournamentEndAt = tournamentStartAt.add(30, "minutes");
    const pt = await ctx.prisma.paidTournament.create({
      data: {
        title: "ut",
        startAt: tournamentStartAt.toDate(),
        endAt: tournamentEndAt.toDate(),
        entryFeeTickets: 1,
        entries: {
          create: {
            userId: ctx.userId!,
            usedTickets: 1,
          },
        },
        paidTournamentBoosterAvailable: {
          createMany: {
            data: [
              {
                boosterMasterId: "GAME_SWAP-BUBBLE_ATTACK-10M",
              },
              {
                boosterMasterId: "GAME_SWAP-BUBBLE_ATTACK-15M",
              },
              {
                boosterMasterId: "GAME_SWAP-MYTHIC_MATCH-10M",
              },
              {
                boosterMasterId: "GAME_SWAP-BUBBLE_ATTACK-ALL",
              },
            ],
          },
        },
      },
    });
    const firstApply = await useCase.apply(
      ctx,
      "GAME_SWAP-BUBBLE_ATTACK-10M",
      pt.id,
    );
    expect(firstApply).toMatchObject({
      userId: ctx.userId!,
      category: "GAME_SWAP",
      subCategory: "BUBBLE_ATTACK",
      paidTournamentId: pt.id,
    });
    // DateをいじれないのでNowより未来であることをチェック
    expect(firstApply.endAt.getTime()).toBeGreaterThan(new Date().getTime());

    // 2回目の適用=効果時間延長
    const secondApply = await useCase.apply(
      ctx,
      "GAME_SWAP-BUBBLE_ATTACK-15M",
      pt.id,
    );
    expect(secondApply).toMatchObject({
      userId: ctx.userId!,
      category: "GAME_SWAP",
      subCategory: "BUBBLE_ATTACK",
      // 効果時間延長をチェック
      endAt: dayjs(firstApply.endAt).add(15, "minutes").toDate(),
    });

    // ここまでで25分分効果を買っている
    // 10分は買えない
    await expect(
      useCase.apply(ctx, "GAME_SWAP-BUBBLE_ATTACK-10M", pt.id),
    ).rejects.toThrow(InvalidArgumentUseCaseError);

    // 別のゲームは買える
    const otherGameApply = await useCase.apply(
      ctx,
      "GAME_SWAP-MYTHIC_MATCH-10M",
      pt.id,
    );
    expect(otherGameApply).toMatchObject({
      userId: ctx.userId!,
      category: "GAME_SWAP",
      subCategory: "MYTHIC_MATCH",
      paidTournamentId: pt.id,
    });
    // DateをいじれないのでNowより未来であることをチェック
    expect(otherGameApply.endAt.getTime()).toBeGreaterThan(
      new Date().getTime(),
    );

    // 別トーナメントも買える
    const otherPT = await ctx.prisma.paidTournament.create({
      data: {
        title: "ut",
        startAt: tournamentStartAt.toDate(),
        endAt: tournamentEndAt.toDate(),
        entryFeeTickets: 1,
        entries: {
          create: {
            userId: ctx.userId!,
            usedTickets: 1,
          },
        },
        paidTournamentBoosterAvailable: {
          createMany: {
            data: [
              {
                boosterMasterId: "GAME_SWAP-BUBBLE_ATTACK-10M",
              },
              {
                boosterMasterId: "GAME_SWAP-BUBBLE_ATTACK-15M",
              },
              {
                boosterMasterId: "GAME_SWAP-MYTHIC_MATCH-10M",
              },
              {
                boosterMasterId: "GAME_SWAP-BUBBLE_ATTACK-ALL",
              },
            ],
          },
        },
      },
    });
    const otherApply = await useCase.apply(
      ctx,
      "GAME_SWAP-BUBBLE_ATTACK-ALL",
      otherPT.id,
    );
    expect(otherApply).toMatchObject({
      userId: ctx.userId!,
      category: "GAME_SWAP",
      subCategory: "BUBBLE_ATTACK",
      endAt: tournamentEndAt.toDate(),
      paidTournamentId: otherPT.id,
    });
    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    expect(afterUser.tickets).toEqual(1000 - 10 - 15 - 10 - 100);
    const afterTransactions = await ctx.prisma.ticketTransaction.findMany({
      orderBy: { createdAt: "asc" },
    });
    expect(afterTransactions).toHaveLength(4);
    expect(afterTransactions).toMatchObject([
      {
        userId: ctx.userId,
        changeAmount: -10,
        balance: 990,
        transactionType: "TOURNAMENT_BOOSTER",
        transactionDetail: JSON.stringify({
          tournamentId: pt.id,
          category: "GAME_SWAP",
          subCategory: "BUBBLE_ATTACK",
          variant: "10m",
        }),
      },
      {
        userId: ctx.userId,
        changeAmount: -15,
        balance: 975,
        transactionType: "TOURNAMENT_BOOSTER",
        transactionDetail: JSON.stringify({
          tournamentId: pt.id,
          category: "GAME_SWAP",
          subCategory: "BUBBLE_ATTACK",
          variant: "15m",
        }),
      },
      {
        userId: ctx.userId,
        changeAmount: -10,
        balance: 965,
        transactionType: "TOURNAMENT_BOOSTER",
        transactionDetail: JSON.stringify({
          tournamentId: pt.id,
          category: "GAME_SWAP",
          subCategory: "MYTHIC_MATCH",
          variant: "10m",
        }),
      },
      {
        userId: ctx.userId,
        changeAmount: -100,
        balance: 865,
        transactionType: "TOURNAMENT_BOOSTER",
        transactionDetail: JSON.stringify({
          tournamentId: otherPT.id,
          category: "GAME_SWAP",
          subCategory: "BUBBLE_ATTACK",
          variant: "ALL",
        }),
      },
    ]);
  });
  test("EasyMode", async () => {
    const ctx = await createMockContext({
      tickets: 1000,
    });
    // 初回適用
    const firstApply = await useCase.apply(ctx, "EASY_MODE-ALL-10M");
    expect(firstApply).toMatchObject({
      userId: ctx.userId!,
      category: "EASY_MODE",
      subCategory: "ALL",
    });
    // DateをいじれないのでNowより未来であることをチェック
    expect(firstApply.endAt.getTime()).toBeGreaterThan(new Date().getTime());
    // 2回目の適用=効果時間延長
    const secondApply = await useCase.apply(ctx, "EASY_MODE-ALL-15M");
    expect(secondApply).toMatchObject({
      userId: ctx.userId!,
      category: "EASY_MODE",
      subCategory: "ALL",
      // 効果時間延長をチェック
      endAt: dayjs(firstApply.endAt).add(15, "minutes").toDate(),
    });
    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId! },
    });
    expect(afterUser.tickets).toEqual(1000 - 1 - 2);
    const afterTransactions = await ctx.prisma.ticketTransaction.findMany({
      orderBy: { createdAt: "asc" },
    });
    expect(afterTransactions).toHaveLength(2);
    expect(afterTransactions).toMatchObject([
      {
        userId: ctx.userId,
        changeAmount: -1,
        balance: 999,
        transactionType: "TOURNAMENT_BOOSTER",
        transactionDetail: JSON.stringify({
          category: "EASY_MODE",
          subCategory: "ALL",
          variant: "10m",
        }),
      },
      {
        userId: ctx.userId,
        changeAmount: -2,
        balance: 997,
        transactionType: "TOURNAMENT_BOOSTER",
        transactionDetail: JSON.stringify({
          category: "EASY_MODE",
          subCategory: "ALL",
          variant: "15m",
        }),
      },
    ]);
  });
});
