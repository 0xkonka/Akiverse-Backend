import { Context } from "../context";
import {
  AccumulatorId,
  accumulators,
  CabinetCategoryId,
  getArcadePartMetadata,
  getJunkMetadata,
  lowerCabinets,
  roms,
  upperCabinets,
} from "../metadata/arcade-parts";
import {
  ConflictUseCaseError,
  ExtractItemInsufficientUseCaseError,
  IllegalStateUseCaseError,
  InternalServerUseCaseError,
  NotFoundUseCaseError,
  PermissionDeniedUseCaseError,
  StateChangeUseCaseError,
} from "./errors";
import {
  BaseExtractItems,
  getExtractItemCount,
  ExtractCodes,
  getExtractPriority,
} from "../models/extract_table";
import prisma, { PRISMA_NOT_FOUND_ERROR_CODE } from "../prisma";
import { Service } from "typedi";
import {
  ArcadePart,
  ArcadePartCategory,
  ExtractableItemType,
  Junk,
  NftState,
  Season,
  Prisma,
} from "@prisma/client";
import { GameId } from "../metadata/games";
import { choiceMultiple, makeCompare, sum } from "../utils";
import { getRandomInt } from "../utils";
import _ from "lodash";
import { EXTRACT_FEES } from "../constants";

export type BoxItem = {
  category: ArcadePartCategory;
  subCategory: string;
  amount: number;
  initialAmount: number;
  isFeaturedItem: boolean;
  isJunk: boolean;
  name: string;
};
export type ExtractCurrencyType = "TERAS" | "AKV";
export interface ExtractUseCase {
  minNumberOfExtractItems(
    ctx: Context,
    accumulatorSubCategory: string,
    energy: number,
    extractedEnergy: number,
  ): Promise<MinNumberOfExtractItemsResponse>;
  listBoxItems(ctx: Context): Promise<BoxItem[]>;
  extract(
    ctx: Context,
    arcadeMachineId: string,
    extractCode: number,
    currencyType: ExtractCurrencyType,
  ): Promise<(ArcadePart | Junk)[]>;
}

const EXTRACT_BASE_ENERGY = 10000;

export type MinNumberOfExtractItemsResponse = {
  // 抽選コード
  extractCode?: ExtractCodes;
  // 排出数
  count: number;
};

@Service("extract.useCase")
export class ExtractUseCaseImpl implements ExtractUseCase {
  async minNumberOfExtractItems(
    ctx: Context,
    accumulatorSubCategory: string,
    energy: number,
    extractedEnergy: number,
  ): Promise<MinNumberOfExtractItemsResponse> {
    let extractCode: ExtractCodes;
    try {
      extractCode = this.getDefaultExtractCode(
        accumulatorSubCategory,
        energy,
        extractedEnergy,
      );
    } catch (e: unknown) {
      // IllegalStateの時はExtractできない時
      if (e instanceof IllegalStateUseCaseError) {
        return {
          count: 0,
        };
      }
      throw e;
    }

    const { baseExtractItemCount } = await this.getNowSeason();

    const count = getExtractItemCount(
      extractCode,
      baseExtractItemCount as BaseExtractItems,
    );
    if (!count) {
      throw new InternalServerUseCaseError("unknown extract item count");
    }

    return {
      extractCode: extractCode,
      count,
    };
  }

  // 現在有効なBaseExtractItemを取得する
  private async getNowSeason(): Promise<Season> {
    const now = new Date();
    const nowSeason = await prisma.season.findFirst({
      where: {
        startAt: {
          lte: now,
        },
        AND: {
          OR: [
            {
              endAt: null,
            },
            {
              endAt: {
                gte: now,
              },
            },
          ],
        },
      },
    });
    if (!nowSeason) {
      throw new InternalServerUseCaseError("season record not found");
    }
    return nowSeason;
  }

  private getDefaultExtractCode(
    accumulatorSubCategory: string,
    energy: number,
    extractedEnergy: number,
  ): ExtractCodes {
    const metadata = accumulators[accumulatorSubCategory as AccumulatorId];
    if (!metadata) {
      throw new InternalServerUseCaseError("unknown accumulator");
    }
    const unusedEnergy = energy - extractedEnergy;
    if (unusedEnergy < metadata.extractableEnergy) {
      throw new IllegalStateUseCaseError("energy insufficient");
    }

    // 先にExtractableEnergyで割った際の余りを算出し、割り切れる値のみにしてからExtractCodeを算出する
    const reminder = unusedEnergy % metadata.extractableEnergy;
    const extractTargetEnergy = unusedEnergy - reminder;
    return (extractTargetEnergy / EXTRACT_BASE_ENERGY) as ExtractCodes;
  }

  async listBoxItems(ctx: Context): Promise<BoxItem[]> {
    // Seasonを取得する
    const season = await this.getNowSeason();
    // Seasonに紐づくInitialInventoryを取得
    const initialInventories =
      await ctx.prisma.extractInitialInventory.findMany({
        where: {
          seasonId: season.id,
        },
      });
    // InitialInventoriesをループして現在残っている数を取得する
    const boxItems: BoxItem[] = [];
    for (const initialInventory of initialInventories) {
      if (initialInventory.itemType === ExtractableItemType.ARCADE_PART) {
        // AP
        // APはarcade_partsテーブルからuserId未設定かつIN_AKIVERSEのNFTの数を集める
        const amount = await ctx.prisma.arcadePart.count({
          where: {
            userId: null,
            state: NftState.IN_AKIVERSE,
            category: initialInventory.category as ArcadePartCategory,
            subCategory: initialInventory.subCategory,
          },
        });
        const metadata = getArcadePartMetadata(
          initialInventory.category as ArcadePartCategory,
          initialInventory.subCategory,
        );

        boxItems.push({
          category: initialInventory.category as ArcadePartCategory,
          subCategory: initialInventory.subCategory,
          initialAmount: initialInventory.initialAmount,
          amount: amount,
          isJunk: false,
          isFeaturedItem: initialInventory.featuredItem,
          name: metadata.name!,
        });
      } else {
        // Junk
        // JunkはExtractJunkInventoryのamountが在庫数
        const junkInventory =
          await ctx.prisma.extractJunkInventory.findUniqueOrThrow({
            where: {
              category_subCategory: {
                category: initialInventory.category as ArcadePartCategory,
                subCategory: initialInventory.subCategory,
              },
            },
          });
        const metadata = getJunkMetadata(
          initialInventory.category as ArcadePartCategory,
          initialInventory.subCategory,
        );
        boxItems.push({
          category: initialInventory.category as ArcadePartCategory,
          subCategory: initialInventory.subCategory,
          initialAmount: initialInventory.initialAmount,
          amount: junkInventory.amount,
          isJunk: true,
          isFeaturedItem: initialInventory.featuredItem,
          name: metadata.name,
        });
      }
    }
    boxItems.sort(makeCompare(toArray));

    return boxItems;
  }

  async extract(
    ctx: Context,
    arcadeMachineId: string,
    extractCode: number,
    currencyType: ExtractCurrencyType,
  ): Promise<(ArcadePart | Junk)[]> {
    try {
      return await this.execute(
        ctx,
        arcadeMachineId,
        extractCode,
        currencyType,
      );
    } catch (e: unknown) {
      if (e instanceof ConflictUseCaseError) {
        // Conflictした場合は再実行する。それでもConflictしたらエラーで返す
        return await this.execute(
          ctx,
          arcadeMachineId,
          extractCode,
          currencyType,
        );
      }
      throw e;
    }
  }
  private async execute(
    ctx: Context,
    arcadeMachineId: string,
    extractCode: number,
    currencyType: ExtractCurrencyType,
  ): Promise<(ArcadePart | Junk)[]> {
    const am = await ctx.prisma.arcadeMachine.findUnique({
      where: {
        id: arcadeMachineId,
      },
    });
    if (!am) {
      throw new NotFoundUseCaseError(
        "arcade machine not found",
        "ArcadeMachine",
      );
    }
    if (!ctx.currentUserOwns(am)) {
      throw new PermissionDeniedUseCaseError();
    }

    const defaultExtractCode = this.getDefaultExtractCode(
      am.accumulatorSubCategory,
      am.energy,
      am.extractedEnergy,
    );
    if (extractCode !== defaultExtractCode) {
      // Sparkが加算され、画面表示時よりExtractで利用されるEnergyが増えているのでそのままではExtractさせない
      throw new StateChangeUseCaseError();
    }

    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: {
        id: ctx.userId,
      },
    });

    if (currencyType === "TERAS") {
      if (user.terasBalance.lt(EXTRACT_FEES.TERAS)) {
        throw new IllegalStateUseCaseError("Teras insufficient");
      }
    } else {
      if (user.akvBalance.lt(EXTRACT_FEES.AKV)) {
        throw new IllegalStateUseCaseError("AKV insufficient");
      }
    }

    let addRandomExtractCode = (defaultExtractCode +
      getRandomInt(0, 3)) as ExtractCodes;

    // 現在の基準排出数
    const { baseExtractItemCount } = await this.getNowSeason();

    // 全在庫数を取得
    const boxItems = await this.listBoxItems(ctx);
    const totalItems = sum(boxItems.map((v) => v.amount));

    let extractItemCount = getExtractItemCount(
      addRandomExtractCode,
      baseExtractItemCount as BaseExtractItems,
    );
    if (!extractItemCount) {
      throw new InternalServerUseCaseError("unknown ExtractCode");
    }

    // 総アイテム数より排出する数が多い場合は、defaultExtractCodeで排出したら在庫不足しないかチェック
    if (totalItems < extractItemCount) {
      const extractItemCountFromBase = getExtractItemCount(
        defaultExtractCode,
        baseExtractItemCount as BaseExtractItems,
      );
      if (!extractItemCountFromBase) {
        throw new InternalServerUseCaseError("unknown ExtractCode");
      }
      if (totalItems < extractItemCountFromBase) {
        // defaultExtractCodeで排出数を決定した場合も不足するのでエラー
        throw new ExtractItemInsufficientUseCaseError();
      }
      // 排出アイテム数をデフォルト値から算出した数で上書き
      extractItemCount = extractItemCountFromBase;
      addRandomExtractCode = defaultExtractCode;
    }

    const extractedItems = extract(addRandomExtractCode, boxItems, totalItems);

    // 並べ替えたものから実際に排出する数だけ切り出す
    const selectedItems = extractedItems.slice(0, extractItemCount);

    // AMは対象のIDを選択する
    const extractArcadeParts = selectedItems.filter((v) => !v.isJunk);
    const arcadePartIDs: string[] = [];

    // category/subCategoryごとに集計したMap
    const arcadePartsNumMap = countOfParts(extractArcadeParts);

    // 集計したAPの必要数からIDを決定する
    for (const key of arcadePartsNumMap.keys()) {
      const parts = arcadePartsNumMap.get(key)!;
      const ids = await ctx.prisma.arcadePart.findMany({
        select: { id: true },
        where: {
          category: parts.category,
          subCategory: parts.subCategory,
          userId: null,
          state: NftState.IN_AKIVERSE,
        },
        take: parts.count + 10, // ランダムで選択するため、多く取得しておく
      });
      if (ids.length < parts.count) {
        // 他の人がExtractして不足した
        throw new ConflictUseCaseError("arcade parts insufficient");
      }

      arcadePartIDs.push(
        ...choiceMultiple(
          ids.map((v) => v.id),
          parts.count,
        ),
      );
    }

    const updateQueries = [];

    // ArcadePartにUserを紐づける
    // updateを使うことで更新対象が0行だった時(他のユーザーが行ったExtractで対象APのUserIDが設定されていた時)にエラーを発生させる
    for (const id of arcadePartIDs) {
      updateQueries.push(
        ctx.prisma.arcadePart.update({
          data: {
            userId: ctx.userId!,
          },
          where: {
            id: id,
            userId: null,
          },
        }),
      );
    }

    // Junkを減算＆加算する
    const extractJunkParts = selectedItems.filter((v) => v.isJunk);
    const junkPartsNumMap = countOfParts(extractJunkParts);
    for (const key of junkPartsNumMap.keys()) {
      const p = junkPartsNumMap.get(key)!;
      // Boxから減らす
      updateQueries.push(
        ctx.prisma.extractJunkInventory.update({
          where: {
            category_subCategory: {
              category: p.category,
              subCategory: p.subCategory,
            },
          },
          data: {
            amount: {
              decrement: p.count,
            },
          },
        }),
      );
      // UserのJunkレコードをUpsert
      updateQueries.push(
        ctx.prisma.junk.upsert({
          where: {
            userId_category_subCategory: {
              userId: ctx.userId!,
              category: p.category,
              subCategory: p.subCategory,
            },
          },
          update: {
            amount: {
              increment: p.count,
            },
          },
          create: {
            category: p.category,
            subCategory: p.subCategory,
            userId: ctx.userId!,
            amount: p.count,
          },
        }),
      );
    }
    // 使った分のEnergyを減算
    updateQueries.push(
      ctx.prisma.arcadeMachine.update({
        // extractedEnergyが変わっていたらConflictしているのでWhereの条件にする
        where: { id: arcadeMachineId, extractedEnergy: am.extractedEnergy },
        data: {
          extractedEnergy: {
            increment: extractCode * EXTRACT_BASE_ENERGY,
          },
        },
      }),
    );

    // Teras消費
    const { teras, akv } =
      currencyType === "TERAS"
        ? { teras: EXTRACT_FEES.TERAS, akv: new Prisma.Decimal(0) }
        : { teras: new Prisma.Decimal(0), akv: EXTRACT_FEES.AKV };
    updateQueries.push(
      ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: {
          terasBalance: {
            decrement: teras,
          },
          akvBalance: {
            decrement: akv,
          },
        },
      }),
    );

    try {
      const updated = await ctx.prisma.$transaction(updateQueries);
      // 更新結果からAPとJunkの更新結果だけにする
      const filtered = updated.filter((value) => {
        return "category" in value && "userId" in value;
      }) as (ArcadePart | Junk)[];

      // 結果を返す時は優先度の小さいほうから返す必要がある
      const sorted = filtered
        .map((v) => {
          const isJunk = !("ownerWalletAddress" in v);
          return {
            priority: getExtractPriority(isJunk, v.category, v.subCategory),
            isJunk: isJunk,
            item: v,
          };
        })
        .sort(priorityCompare)
        .reverse();

      // Junkは更新した数分のレコードが存在しないので複製する
      const retArray = [];
      const detailArcadeParts = [];
      for (const item of sorted) {
        if (!item.isJunk) {
          retArray.push(item.item);
          detailArcadeParts.push(item.item as ArcadePart);
          continue;
        }
        const { category, subCategory } = item.item;
        const { count } = junkPartsNumMap.get(`${category}-${subCategory}`)!;
        // 取得した数分増やす
        for (let i = 0; i < count; i++) {
          retArray.push(item.item);
        }
      }

      // Extractの履歴保存(IDを使うので別トランザクション)
      await ctx.prisma.extract.create({
        data: {
          userId: ctx.userId!,
          arcadeMachineId: arcadeMachineId,
          extractArcadePartsCount: extractArcadeParts.length,
          extractJunkPartsCount: extractJunkParts.length,
          extractDetail: makeExtractDetail(detailArcadeParts, junkPartsNumMap),
        },
      });

      return retArray;
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientUnknownRequestError) {
        if (e.message.includes("teras_balance_over_zero")) {
          throw new IllegalStateUseCaseError("Teras balance is insufficient");
        } else if (e.message.includes("extract_junk_inventories")) {
          throw new ConflictUseCaseError("Junk inventory is insufficient");
        }
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        /*
        Teras不足(teras_balance_over_zero)、AMのEnergy不足はリトライしても意味がない
        リトライできるのはJunkの数、APの更新対象が0行の時のみ
         */
        if (
          e.code === PRISMA_NOT_FOUND_ERROR_CODE &&
          e.message.includes("ctx.prisma.arcadeMachine.update()")
        ) {
          // 他のブラウザなどでExtractが実施されている状態
          throw new IllegalStateUseCaseError("Extract conflicted");
        }
      }
      throw e;
    }
  }
}

// 排出優先度の大きい順に並べ替える
function priorityCompare(
  a: { priority: number },
  b: { priority: number },
): number {
  if (a.priority === b.priority) return 0;
  if (a.priority > b.priority) {
    return -1;
  }
  return 1;
}

/**
 * boxからextractCode分アイテムを取り出し、並べ替えた配列を返す
 * @param extractCode 抽選コード = 抽選回数になる
 * @param box
 * @param totalItems boxの中にある在庫数
 * 呼び出し元側で必要とするアイテム数 < 抽選回数なので、途中でアイテムの在庫が切れることがある
 */
function extract(
  extractCode: number,
  box: BoxItem[],
  totalItems: number,
): ExtractedItem[] {
  const retArray: ExtractedItem[] = [];

  // 副作用を起こさないようにDeepClone
  const clonedBox = _.cloneDeep(box);

  let total = totalItems;
  // 抽選回数分アイテムをBoxから取り出す
  for (let i = 0; i < extractCode; i++) {
    if (total === 0) {
      // 在庫がなくなったらループ抜ける
      break;
    }

    // すべてのアイテムの中から一つの番号をランダムに抽選する
    const itemNumber = getRandomInt(1, total);

    let currentNumber = 0;
    for (let j = 0; j < clonedBox.length; j++) {
      const currentItem = clonedBox[j];
      if (currentItem.amount === 0) {
        // すべて排出済みのItemは無視する
        continue;
      }
      // 現在値に次のアイテムの保有数を足す
      currentNumber = currentNumber + currentItem.amount;
      if (currentNumber >= itemNumber) {
        // 現在値よりitemNumberが若い時、そのアイテムが抽選された
        currentItem.amount = currentItem.amount - 1;
        // 総在庫数から減算
        total--;
        retArray.push({
          isJunk: currentItem.isJunk,
          category: currentItem.category,
          subCategory: currentItem.subCategory,
          priority: getExtractPriority(
            currentItem.isJunk,
            currentItem.category,
            currentItem.subCategory,
          ),
        });
        // アイテムを選択したので次の抽選へ
        break;
      }
    }
  }
  // 排出優先度順に並び替え
  return retArray.sort(priorityCompare);
}

type ExtractDetail = ExtractArcadePartDetail | ExtractJunkPartDetail;

type ExtractArcadePartDetail = {
  isJunk: false;
  category: string;
  subCategory: string;
  id: string;
};

type ExtractJunkPartDetail = {
  isJunk: true;
  category: string;
  subCategory: string;
  amount: number;
};

function makeExtractDetail(
  arcadeParts: ArcadePart[],
  junkParts: Map<string, CountOfParts>,
) {
  const retArray: ExtractDetail[] = [];
  for (const ap of arcadeParts) {
    retArray.push({
      isJunk: false,
      category: ap.category,
      subCategory: ap.subCategory,
      id: ap.id,
    });
  }
  for (const junk of junkParts) {
    retArray.push({
      isJunk: true,
      category: junk[1].category,
      subCategory: junk[1].subCategory,
      amount: junk[1].count,
    });
  }
  return retArray;
}

type CountOfParts = {
  category: ArcadePartCategory;
  subCategory: string;
  count: number;
};
function countOfParts(items: ExtractedItem[]): Map<string, CountOfParts> {
  const map = new Map<string, CountOfParts>();
  for (const item of items) {
    const key = `${item.category}-${item.subCategory}`;
    const before = map.get(key);
    if (!before) {
      map.set(key, {
        category: item.category,
        subCategory: item.subCategory,
        count: 1,
      });
    } else {
      before.count++;
      map.set(key, before);
    }
  }
  return map;
}

type ExtractedItem = {
  isJunk: boolean;
  category: ArcadePartCategory;
  subCategory: string;
  priority: number;
};

// AP -> Junk
// ROM -> ACC -> UC -> LC
// category内はmetadataが持っているorder
// の順に並べ替えるため、compareArraysに渡す配列を生成する
function toArray(item: BoxItem): number[] {
  const itemTypeOrder =
    itemTypeSortOrders[
      item.isJunk
        ? ExtractableItemType.JUNK_PART
        : ExtractableItemType.ARCADE_PART
    ];
  const categoryOrder = categorySortOrders[item.category];
  let subCategoryOrder: number;
  let ret: { order: number };
  switch (item.category) {
    case "ROM":
      ret = roms[item.subCategory as GameId];
      subCategoryOrder = ret.order;
      break;
    case "ACCUMULATOR":
      ret = accumulators[item.subCategory as AccumulatorId];
      subCategoryOrder = ret.order;
      break;
    case "UPPER_CABINET":
      ret = upperCabinets[item.subCategory as CabinetCategoryId];
      subCategoryOrder = ret.order;
      break;
    case "LOWER_CABINET":
      ret = lowerCabinets[item.subCategory as CabinetCategoryId];
      subCategoryOrder = ret.order;
      break;
  }
  return [itemTypeOrder, categoryOrder, subCategoryOrder];
}

const categorySortOrders: Record<ArcadePartCategory, number> = {
  ROM: 1,
  ACCUMULATOR: 2,
  UPPER_CABINET: 3,
  LOWER_CABINET: 4,
};

const itemTypeSortOrders: Record<ExtractableItemType, number> = {
  ARCADE_PART: 1,
  JUNK_PART: 2,
};

// AP/Junkのカテゴリ内の並び順はmetadata/arcade-parts.tsにある
