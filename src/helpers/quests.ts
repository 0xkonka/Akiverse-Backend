import { Context } from "../context";
import {
  ArcadePartCategory,
  CollectibleItemCategory,
  Quest,
  QuestChain,
  QuestProgressType,
  QuestRewardCategory,
  QuestRewardType,
} from "@prisma/client";
import { Service } from "typedi";
import { choice } from "../utils";
import { availableRewardArcadeParts } from "./rewards";
import dayjs from "dayjs";
import { TERM_TIME_ZONE } from "../constants";
import { getNowProgress } from "../models/internal/quests/utils";

type QuestWithQuestChain = Quest & { questChain: QuestChain };

@Service("questProgressChecker")
export class QuestProgressChecker {
  async checkAndUpdate(ctx: Context): Promise<void> {
    const inProgresses = await this.getInProgressQuests(ctx);
    let forceReCheck = false;
    let hasCompleteQuest = false;
    for (const inProgress of inProgresses) {
      const chainMaster = await ctx.prisma.questChainMaster.findUnique({
        where: {
          id: inProgress.questChain.questChainMasterId,
        },
        include: {
          quests: true,
        },
      });
      if (!chainMaster) {
        return;
      }

      // questMaster取得
      const questMaster = chainMaster.quests.find(
        (value) => value.id === inProgress.questMasterId,
      );
      if (!questMaster) {
        return;
      }

      // QuestChainの有効期限外の場合は更新しない
      if (chainMaster.endAt) {
        const now = new Date();
        if (chainMaster.endAt < now) {
          const endAtAfter1Month = dayjs(chainMaster.endAt)
            .tz(TERM_TIME_ZONE)
            .add(1, "month")
            .toDate();
          if (endAtAfter1Month < now) {
            // イベント期限より１ヶ月以上立っている未達成クエストはレコードごと削除
            await ctx.prisma.$transaction([
              ctx.prisma.quest.deleteMany({
                where: { questChainId: inProgress.questChainId },
              }),
              ctx.prisma.questChain.delete({
                where: { id: inProgress.questChainId },
              }),
            ]);
          }
          // 期間外なので進捗更新は行わない
          continue;
        }
      }

      const progress = await getNowProgress(
        ctx,
        inProgress.startAt,
        questMaster,
      );
      // 達成判定
      if (progress >= questMaster.progressGoal) {
        const queries = [];
        // リワード配布処理
        if (questMaster.itemType) {
          queries.push(
            ...this.distributeReward(
              ctx,
              questMaster.title,
              questMaster.itemType,
              questMaster.category!,
              questMaster.subCategory,
              questMaster.amount!,
            ),
          );
        }
        hasCompleteQuest = true;
        queries.push(
          ctx.prisma.quest.update({
            data: {
              completedAt: new Date(),
            },
            where: {
              questChainId_questMasterId: {
                questChainId: inProgress.questChainId,
                questMasterId: inProgress.questMasterId,
              },
              // completedAtが入っていた場合、それは別トランザクションで更新されている
              completedAt: null,
            },
          }),
        );
        try {
          await ctx.prisma.$transaction(queries);
        } catch (e: unknown) {
          // 同時実行などでquestテーブルが更新できなかった時に例外を吐くことがある
          ctx.log.warn(e);
        }
      }
    }
    // いずれかのクエストを達成にした場合、次のクエストを投入する
    if (hasCompleteQuest) {
      // 達成状況再取得
      const inProgresses = await ctx.prisma.questChain.findMany({
        where: {
          userId: ctx.userId,
          completed: false,
          AND: {
            OR: [
              {
                expiredAt: null,
              },
              {
                expiredAt: {
                  gte: new Date(),
                },
              },
            ],
          },
        },
        include: {
          quests: {
            select: {
              id: true,
              completedAt: true,
              questMasterId: true,
            },
          },
        },
      });

      // クエストチェーンごとに処理
      for (const inProgress of inProgresses) {
        const chainMaster = await ctx.prisma.questChainMaster.findUniqueOrThrow(
          {
            where: {
              id: inProgress.questChainMasterId,
            },
            include: {
              quests: true,
            },
          },
        );
        // まだ解放していないクエスト一覧を作る
        const notOpenQuests = chainMaster.quests.filter(
          (m) => !inProgress.quests.find((v) => v.questMasterId === m.id),
        );
        for (const notOpenQuest of notOpenQuests) {
          const beforeQuestIds = notOpenQuest.beforeQuestIds!.split(",");
          // inProgress.questsの中にcompletedで全て存在するか判定
          let hasNoCompleteQuest = false;
          for (const beforeQuestId of beforeQuestIds) {
            const before = inProgress.quests.find(
              (v) => v.questMasterId === beforeQuestId,
            );
            if (!before || before.completedAt === null) {
              hasNoCompleteQuest = true;
            }
          }
          if (hasNoCompleteQuest) {
            // 進行中のクエストに存在してないor未達成のため、解放されることはない
            continue;
          }
          // 前提条件のクエストを全て達成しているのでクエストを解放する
          await ctx.prisma.quest.create({
            data: {
              questChainId: inProgress.id,
              startAt: new Date(),
              questMasterId: notOpenQuest.id,
            },
          });

          // コネクトウォレット時は即時達成する可能性があるので強制再チェック
          if (notOpenQuest.progressType === QuestProgressType.CONNECT_WALLET) {
            forceReCheck = true;
          }
        }
      }
    }
    if (forceReCheck) {
      // 即時達成の可能性があるクエストを登録した場合に再チェックする
      await this.checkAndUpdate(ctx);
    }
  }

  private async getInProgressQuests(
    ctx: Context,
  ): Promise<QuestWithQuestChain[]> {
    return ctx.prisma.quest.findMany({
      where: {
        completedAt: null,
        questChain: {
          userId: ctx.userId!,
          completed: false,
        },
      },
      include: {
        questChain: true,
      },
    });
  }

  protected distributeReward(
    ctx: Context,
    title: string,
    itemType: QuestRewardType,
    category: QuestRewardCategory,
    subCategory: string | null,
    amount: number,
  ) {
    switch (itemType) {
      case "ARCADE_PART":
        // AP
        return [
          ctx.prisma.reward.create({
            data: {
              userId: ctx.userId!,
              rewardItemType: "ARCADE_PART",
              category: category as ArcadePartCategory,
              subCategory: subCategory,
              amount: amount,
              title: title,
            },
          }),
        ];
      case "ARCADE_PART_RANDOM":
        // AP
        return this.rewardRandomArcadePartOrJunk(
          ctx,
          title,
          "ARCADE_PART",
          amount,
        );
      case "JUNK_PART":
        // JUNK
        return [
          ctx.prisma.reward.create({
            data: {
              userId: ctx.userId!,
              rewardItemType: "JUNK_PART",
              category: category as ArcadePartCategory,
              subCategory: subCategory,
              amount: amount,
              title: title,
            },
          }),
        ];
      case "JUNK_PART_RANDOM":
        // JUNK
        return this.rewardRandomArcadePartOrJunk(
          ctx,
          title,
          "JUNK_PART",
          amount,
        );
      case "TERAS":
        // Teras
        return [
          ctx.prisma.reward.create({
            data: {
              userId: ctx.userId!,
              rewardItemType: "TERAS",
              category: "TERAS",
              amount: amount,
              title: title,
            },
          }),
        ];
      case "COLLECTIBLE_ITEM":
        // CollectibleItem
        return [
          ctx.prisma.reward.create({
            data: {
              userId: ctx.userId!,
              rewardItemType: "COLLECTIBLE_ITEM",
              category: category as CollectibleItemCategory,
              subCategory: subCategory,
              amount: amount,
              title: title,
            },
          }),
        ];
    }
  }

  private rewardRandomArcadePartOrJunk(
    ctx: Context,
    title: string,
    target: "ARCADE_PART" | "JUNK_PART",
    amount: number = 1,
  ) {
    const rewards = new Map<MapKey, Reward>();

    for (let i = 0; i < amount; i++) {
      const picked = choice(availableRewardArcadeParts);
      const key: MapKey = `${picked.category}-${picked.subCategory}`;
      let amount = 0;
      if (rewards.has(key)) {
        amount = rewards.get(key)!.amount;
      }
      amount++;
      rewards.set(key, {
        category: picked.category,
        subCategory: picked.subCategory,
        amount,
      });
    }

    return [...rewards.values()].map((value) => {
      return ctx.prisma.reward.create({
        data: {
          title: title,
          userId: ctx.userId!,
          rewardItemType: target,
          category: value.category,
          subCategory: value.subCategory,
          amount: value.amount,
        },
      });
    });
  }
}

type MapKey = `${ArcadePartCategory}-${string}`;
type Reward = {
  category: ArcadePartCategory;
  subCategory: string;
  amount: number;
};
