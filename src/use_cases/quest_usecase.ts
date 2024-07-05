import { Context } from "../context";
import {
  ArcadePartCategory,
  CollectibleItemCategory,
  Prisma,
  QuestChain,
} from "@prisma/client";
import {
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
  NotFoundUseCaseError,
} from "./errors";
import {
  rewardArcadePart,
  rewardCollectibleItem,
  rewardJunkPart,
  rewardRandomArcadePart,
  rewardRandomJunkPart,
  rewardTeras,
} from "../helpers/rewards";
import { Service } from "typedi";

import { writeOpenQuestTransaction } from "../helpers/ticket_transaction";
import { getNowProgress } from "../models/internal/quests/utils";

export interface QuestUseCase {
  // QuestChainを請ける
  startQuestChain(
    ctx: Context,
    questChainMasterId: string,
    usedCurrency: StartQuestChainCurrencyType,
  ): Promise<QuestChain>;
  // QuestChainを完了にする
  finishQuestChain(
    ctx: Context,
    questChainMasterId: string,
  ): Promise<FinishQuestChainResponse>;
  // Questの進捗を返す
  progress(
    ctx: Context,
    questMasterId: string,
    completedAt: Date | null | undefined,
    startAt: Date,
  ): Promise<number>;
}

export type FinishQuestChainResponse = QuestChain & {
  rewards: RewardDetail[];
};

type RewardDetailTeras = {
  itemType: "TERAS";
  amount: number;
};

type RewardDetailJunk = {
  itemType: "JUNK_PART";
  category: ArcadePartCategory;
  subCategory: string;
  amount: number;
};

type RewardDetailArcadePart = {
  itemType: "ARCADE_PART";
  category: ArcadePartCategory;
  subCategory: string;
  amount: number;
};

type RewardDetailCollectibleItem = {
  itemType: "COLLECTIBLE_ITEM";
  category: CollectibleItemCategory;
  subCategory: string;
  amount: number;
};

export type RewardDetail =
  | RewardDetailTeras
  | RewardDetailJunk
  | RewardDetailArcadePart
  | RewardDetailCollectibleItem;

export type StartQuestChainCurrencyType = "TERAS" | "AKV" | "TICKET";

@Service("quest.useCase")
export class QuestUseCaseImpl implements QuestUseCase {
  async finishQuestChain(
    ctx: Context,
    questChainMasterId: string,
  ): Promise<FinishQuestChainResponse> {
    const master = await ctx.prisma.questChainMaster.findUnique({
      where: {
        id: questChainMasterId,
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        quests: true,
        rewards: true,
      },
    });
    if (!master) {
      throw new InvalidArgumentUseCaseError("unknown quest chain master id");
    }
    const now = new Date();
    if (master.startAt) {
      // 開始日判定
      if (now < master.startAt) {
        throw new InvalidArgumentUseCaseError(
          "The quest chain is outside the validity period.",
        );
      }
    }
    if (master.endAt) {
      // 終了日判定
      if (master.endAt < now) {
        throw new InvalidArgumentUseCaseError(
          "The quest chain is outside the validity period.",
        );
      }
    }

    const chainWithQuests = await ctx.prisma.questChain.findUnique({
      where: {
        userId_questChainMasterId: {
          userId: ctx.userId!,
          questChainMasterId: master.id,
        },
      },
      include: {
        quests: true,
      },
    });

    if (!chainWithQuests) {
      throw new NotFoundUseCaseError("unknown quest chain id", "QuestChain");
    }
    // 完了済みを完了にはできない
    if (chainWithQuests.completed) {
      throw new IllegalStateUseCaseError("this chain is already completed");
    }
    // ExpiredAtが設定されている場合はチェック
    if (chainWithQuests.expiredAt && chainWithQuests.expiredAt < new Date()) {
      throw new IllegalStateUseCaseError("this chain is already expired");
    }
    // DBのQuestのCompletedの数とmasterのQuest配列の長さが一致していること
    const completedQuest = chainWithQuests.quests
      .map((v) => (v.completedAt ? 1 : (0 as number)))
      .reduce((x, y) => x + y, 0);
    if (completedQuest !== master.quests.length) {
      throw new IllegalStateUseCaseError("uncompleted quest exists");
    }

    // Reward配布する QuestChain完了時は直接配布になる
    const queries = [];
    const rewards: RewardDetail[] = [];
    for (const reward of master.rewards) {
      let rewardRandomResponse;
      switch (reward.itemType) {
        case "TERAS":
          queries.push(rewardTeras(ctx, reward.amount));
          rewards.push({
            itemType: "TERAS",
            amount: reward.amount,
          });
          break;
        case "COLLECTIBLE_ITEM":
          queries.push(
            rewardCollectibleItem(
              ctx,
              reward.category as CollectibleItemCategory,
              reward.subCategory,
            ),
          );
          rewards.push({
            itemType: "COLLECTIBLE_ITEM",
            category: reward.category as CollectibleItemCategory,
            subCategory: reward.subCategory,
            amount: reward.amount,
          });
          break;
        case "ARCADE_PART_RANDOM":
          rewardRandomResponse = rewardRandomArcadePart(ctx, reward.amount);
          queries.push(...rewardRandomResponse.queries);
          rewards.push(
            ...rewardRandomResponse.rewards.map((v) => {
              return {
                itemType: "ARCADE_PART",
                ...v,
              } as RewardDetail;
            }),
          );
          break;
        case "ARCADE_PART":
          queries.push(
            ...rewardArcadePart(
              ctx,
              reward.category as ArcadePartCategory,
              reward.subCategory,
              reward.amount,
            ),
          );
          rewards.push({
            itemType: "ARCADE_PART",
            category: reward.category as ArcadePartCategory,
            subCategory: reward.subCategory,
            amount: reward.amount,
          });
          break;
        case "JUNK_PART_RANDOM":
          rewardRandomResponse = rewardRandomJunkPart(ctx, reward.amount);
          queries.push(...rewardRandomResponse.queries);
          rewards.push(
            ...rewardRandomResponse.rewards.map((v) => {
              return {
                itemType: "JUNK_PART",
                ...v,
              } as RewardDetail;
            }),
          );
          break;
        case "JUNK_PART":
          queries.push(
            rewardJunkPart(
              ctx,
              reward.category as ArcadePartCategory,
              reward.subCategory,
              reward.amount,
            ),
          );
          rewards.push({
            itemType: "JUNK_PART",
            category: reward.category as ArcadePartCategory,
            subCategory: reward.subCategory,
            amount: reward.amount,
          });
          break;
      }
    }

    const ret = await ctx.prisma.$transaction([
      ctx.prisma.questChain.update({
        where: {
          userId_questChainMasterId: {
            userId: ctx.userId!,
            questChainMasterId: master.id,
          },
        },
        data: {
          completed: true,
        },
      }),
      ...queries,
    ]);

    // retの1番目は必ずquestChainの更新、それ以降のRewardの内容次第
    return { ...(ret[0] as QuestChain), rewards: rewards };
  }

  async progress(
    ctx: Context,
    questMasterId: string,
    completedAt: Date | null | undefined,
    startAt: Date,
  ): Promise<number> {
    const master = await ctx.prisma.questMaster.findUnique({
      where: {
        id: questMasterId,
      },
    });
    if (!master) {
      ctx.log.error("unknown quest master id");
      return 0;
    }
    if (completedAt) {
      // 完了している場合、メタデータからそのまま返す
      return master.progressGoal;
    }
    return getNowProgress(ctx, startAt, master);
  }

  async startQuestChain(
    ctx: Context,
    questChainMasterId: string,
    usedCurrency: StartQuestChainCurrencyType,
  ): Promise<QuestChain> {
    const master = await ctx.prisma.questChainMaster.findUnique({
      where: {
        id: questChainMasterId,
      },
      include: {
        quests: {
          where: {
            // 前提がないクエストのみ取得し解放する
            beforeQuestIds: null,
          },
        },
      },
    });
    if (!master) {
      throw new InvalidArgumentUseCaseError("unknown quest chain master id");
    }
    const queries = [];

    const now = new Date();
    if (master.startAt) {
      // 開始日判定
      if (now < master.startAt) {
        throw new InvalidArgumentUseCaseError(
          "The quest chain is outside the validity period.",
        );
      }
    }
    if (master.endAt) {
      // 終了日判定
      if (master.endAt < now) {
        throw new InvalidArgumentUseCaseError(
          "The quest chain is outside the validity period.",
        );
      }
    }

    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });

    // 消費量チェック
    const {
      terasRequiredForRelease,
      akvRequiredForRelease,
      ticketRequiredForRelease,
    } = master;
    if (
      terasRequiredForRelease ||
      akvRequiredForRelease ||
      ticketRequiredForRelease
    ) {
      if (usedCurrency === "TERAS" && terasRequiredForRelease) {
        if (user.terasBalance.lt(new Prisma.Decimal(terasRequiredForRelease))) {
          throw new IllegalStateUseCaseError("Teras balance is insufficient.");
        }
      } else if (usedCurrency === "AKV" && akvRequiredForRelease) {
        if (user.akvBalance.lt(new Prisma.Decimal(akvRequiredForRelease))) {
          throw new IllegalStateUseCaseError("AKV balance is insufficient.");
        }
      } else if (usedCurrency === "TICKET" && ticketRequiredForRelease) {
        if (user.tickets < ticketRequiredForRelease) {
          throw new IllegalStateUseCaseError("Ticket is insufficient.");
        }
      }
    }

    if (master.beforeQuestChainId) {
      const has = await ctx.prisma.questChain.count({
        where: {
          userId: ctx.userId,
          questChainMasterId: master.beforeQuestChainId,
          completed: true,
        },
      });
      if (has === 0) {
        throw new IllegalStateUseCaseError(
          "You must complete the other quest chains first!",
        );
      }
    }
    const quests = master.quests.map((v) => {
      return { startAt: new Date(), questMasterId: v.id };
    });

    queries.push(
      ctx.prisma.questChain.create({
        data: {
          userId: ctx.userId!,
          acceptedAt: new Date(),
          questChainMasterId: master.id,
          completed: false,
          quests: {
            createMany: {
              data: quests,
            },
          },
        },
      }),
    );
    if (usedCurrency === "TERAS" && master.terasRequiredForRelease) {
      queries.push(
        ctx.prisma.user.update({
          data: { terasBalance: { decrement: master.terasRequiredForRelease } },
          where: { id: ctx.userId! },
        }),
      );
    } else if (usedCurrency === "AKV" && master.akvRequiredForRelease) {
      queries.push(
        ctx.prisma.user.update({
          data: { akvBalance: { decrement: master.akvRequiredForRelease } },
          where: { id: ctx.userId! },
        }),
      );
    } else if (usedCurrency === "TICKET" && master.ticketRequiredForRelease) {
      queries.push(
        ctx.prisma.user.update({
          data: { tickets: { decrement: master.ticketRequiredForRelease } },
          where: { id: ctx.userId! },
        }),
      );
      // 履歴更新
      queries.push(
        writeOpenQuestTransaction(
          ctx,
          user.tickets - master.ticketRequiredForRelease,
          master.ticketRequiredForRelease,
          master.id,
        ),
      );
    }
    const ret = await ctx.prisma.$transaction(queries);

    // 最初にQuestChainをしているので、必ずQuestChainが０番目に返ってくる
    return ret[0] as QuestChain;
  }
}
