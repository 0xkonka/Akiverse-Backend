import {
  NonEmptyArray,
  UseMiddleware,
  MiddlewareFn,
  Authorized,
} from "type-graphql";
import { Context } from "../../../context";
import {
  AggregateArcadeMachineResolver,
  FindFirstArcadeMachineResolver,
  FindManyArcadeMachineResolver,
  FindUniqueArcadeMachineResolver,
  GroupByArcadeMachineResolver,
  AggregateArcadePartResolver,
  FindFirstArcadePartResolver,
  FindManyArcadePartResolver,
  FindUniqueArcadePartResolver,
  GroupByArcadePartResolver,
  AggregateGameCenterResolver,
  FindFirstGameCenterResolver,
  FindManyGameCenterResolver,
  FindUniqueGameCenterResolver,
  GroupByGameCenterResolver,
  AggregatePlayResolver,
  FindFirstPlayResolver,
  FindManyPlayResolver,
  FindUniquePlayResolver,
  GroupByPlayResolver,
  PlayRelationsResolver,
  AggregatePlaySessionResolver,
  FindFirstPlaySessionResolver,
  FindManyPlaySessionResolver,
  FindUniquePlaySessionResolver,
  // GroupByPlaySessionResolver,
  PlaySessionRelationsResolver,
  AggregateUserResolver,
  FindFirstUserResolver,
  FindManyUserResolver,
  FindUniqueUserResolver,
  GroupByUserResolver,
  UserRelationsResolver,
  ArcadeMachineRelationsResolver,
  ArcadePartRelationsResolver,
  ModelsEnhanceMap,
  ResolversEnhanceMap,
  GameCenterRelationsResolver,
  // AggregateNotificationResolver,
  // FindFirstNotificationResolver,
  FindManyNotificationResolver,
  // FindUniqueNotificationResolver,
  // GroupByNotificationResolver,
  // NotificationRelationsResolver,
  CraftRelationsResolver,
  FindFirstCraftResolver,
  FindManyCraftResolver,
  FindUniqueCraftResolver,
  GroupByCraftResolver,
  AggregateCraftResolver,
  // Junk
  FindManyJunkResolver,
  JunkRelationsResolver,
  FindFirstJunkResolver,
  FindUniqueJunkResolver,
  GroupByJunkResolver,
  // ExtractJunkInventory
  FindManyExtractJunkInventoryResolver,
  FindFirstExtractJunkInventoryResolver,
  FindUniqueExtractJunkInventoryResolver,
  GroupByExtractJunkInventoryResolver,
  // ExtractInitialInventory
  FindManyExtractInitialInventoryResolver,
  FindFirstExtractInitialInventoryResolver,
  FindUniqueExtractInitialInventoryResolver,
  GroupByExtractInitialInventoryResolver,
  // Extract
  ExtractRelationsResolver,
  FindManyExtractResolver,
  FindFirstExtractResolver,
  FindUniqueExtractResolver,
  GroupByExtractResolver,
  // QuestChain
  QuestChainRelationsResolver,
  // Quest
  QuestRelationsResolver,
  // News
  FindManyNewsResolver,
  // Banner
  FindManyBannerResolver,
  FindUniqueMinimumAppVersionResolver,
  FindManyPaidTournamentBoosterAvailableResolver,
  PaidTournamentRelationsResolver,
  FindUniquePaidTournamentResolver,
  BoosterMasterRelationsResolver,
  PaidTournamentBoosterAvailableRelationsResolver,
  BannerCrudResolver,
  InterstitialBannerCrudResolver,
  FindManyQuestChainMasterResolver,
  QuestChainMasterRelationsResolver,
  // PaidTournament Create/Update
  CreateOnePaidTournamentResolver,
  UpdateOnePaidTournamentResolver,
  AggregatePaidTournamentResolver,
  FindManyBoosterMasterResolver,
} from "@generated/type-graphql";
import { Prisma } from "@prisma/client";
import { Service } from "typedi";
import { ROLES } from "../auth";

// Exposing resolvers
export const GeneratedResolvers: NonEmptyArray<Function> = [
  AggregateArcadeMachineResolver,
  FindFirstArcadeMachineResolver,
  FindManyArcadeMachineResolver,
  FindUniqueArcadeMachineResolver,
  GroupByArcadeMachineResolver,
  AggregateArcadePartResolver,
  FindFirstArcadePartResolver,
  FindManyArcadePartResolver,
  FindUniqueArcadePartResolver,
  GroupByArcadePartResolver,
  // AggregateBlockResolver,
  // FindFirstBlockResolver,
  // FindManyBlockResolver,
  // FindUniqueBlockResolver,
  // GroupByBlockResolver,
  AggregateGameCenterResolver,
  FindFirstGameCenterResolver,
  FindManyGameCenterResolver,
  FindUniqueGameCenterResolver,
  GroupByGameCenterResolver,
  // AggregateMoralisSessionResolver,
  // FindFirstMoralisSessionResolver,
  // FindManyMoralisSessionResolver,
  // FindUniqueMoralisSessionResolver,
  // GroupByMoralisSessionResolver,
  AggregatePlayResolver,
  FindFirstPlayResolver,
  FindManyPlayResolver,
  FindUniquePlayResolver,
  GroupByPlayResolver,
  PlayRelationsResolver,
  AggregatePlaySessionResolver,
  FindFirstPlaySessionResolver,
  FindManyPlaySessionResolver,
  FindUniquePlaySessionResolver,
  // GroupByPlaySessionResolver,
  PlaySessionRelationsResolver,
  // AggregateTransferResolver,
  // FindFirstTransferResolver,
  // FindManyTransferResolver,
  // FindUniqueTransferResolver,
  // GroupByTransferResolver,
  AggregateUserResolver,
  FindFirstUserResolver,
  FindManyUserResolver,
  FindUniqueUserResolver,
  GroupByUserResolver,
  UserRelationsResolver,
  // AggregateWithdrawalResolver,
  // FindFirstWithdrawalResolver,
  // FindManyWithdrawalResolver,
  // FindUniqueWithdrawalResolver,
  // GroupByWithdrawalResolver,
  ArcadeMachineRelationsResolver,
  ArcadePartRelationsResolver,
  GameCenterRelationsResolver,
  // AggregateNotificationResolver,
  // FindFirstNotificationResolver,
  // FIXME カレントユーザーのNotificationsだけを返すクエリを作ったので、FEがデプロイされたら消す
  FindManyNotificationResolver,
  // FindUniqueNotificationResolver,
  // GroupByNotificationResolver,
  // NotificationRelationsResolver,
  CraftRelationsResolver,
  FindFirstCraftResolver,
  FindManyCraftResolver,
  FindUniqueCraftResolver,
  GroupByCraftResolver,
  AggregateCraftResolver,
  FindManyJunkResolver,
  JunkRelationsResolver,
  FindFirstJunkResolver,
  FindUniqueJunkResolver,
  GroupByJunkResolver,
  FindManyExtractJunkInventoryResolver,
  FindFirstExtractJunkInventoryResolver,
  FindUniqueExtractJunkInventoryResolver,
  GroupByExtractJunkInventoryResolver,
  FindManyExtractInitialInventoryResolver,
  FindFirstExtractInitialInventoryResolver,
  FindUniqueExtractInitialInventoryResolver,
  GroupByExtractInitialInventoryResolver,
  ExtractRelationsResolver,
  FindManyExtractResolver,
  FindFirstExtractResolver,
  FindUniqueExtractResolver,
  GroupByExtractResolver,
  QuestChainRelationsResolver,
  QuestRelationsResolver,
  FindManyNewsResolver,
  FindManyBannerResolver,
  FindUniqueMinimumAppVersionResolver,
  FindManyPaidTournamentBoosterAvailableResolver,
  PaidTournamentRelationsResolver,
  FindUniquePaidTournamentResolver,
  BoosterMasterRelationsResolver,
  PaidTournamentBoosterAvailableRelationsResolver,
  // バナーの更新Resolver 別途resolverEnhanceMapで権限制御
  BannerCrudResolver,
  // 全画面バナーの更新Resolver 別途resolverEnhanceMapで権限制御
  InterstitialBannerCrudResolver,
  FindManyQuestChainMasterResolver,
  QuestChainMasterRelationsResolver,
  CreateOnePaidTournamentResolver,
  UpdateOnePaidTournamentResolver,
  AggregatePaidTournamentResolver,
  FindManyBoosterMasterResolver,
];

const UserColumnChecker: MiddlewareFn<Context> = async (
  { root, context, info },
  next,
) => {
  const result = await next();
  const currentUser = context.userId;
  if (currentUser === root.id) return result;

  switch (info.fieldName) {
    case "email":
    case "walletAddress":
      return "[hidden]";
    case "akirBalance":
    case "akvBalance":
    case "terasBalance":
      return new Prisma.Decimal(0);
    case "tickets":
      return 0;
    default:
      return result;
  }
};

export const modelsEnhanceMap: ModelsEnhanceMap = {
  User: {
    fields: {
      email: [UseMiddleware(UserColumnChecker)],
      walletAddress: [UseMiddleware(UserColumnChecker)],
      akirBalance: [UseMiddleware(UserColumnChecker)],
      akvBalance: [UseMiddleware(UserColumnChecker)],
      terasBalance: [UseMiddleware(UserColumnChecker)],
      tickets: [UseMiddleware(UserColumnChecker)],
    },
  },
};
export const resolverEnhanceMap: ResolversEnhanceMap = {
  Banner: {
    _all: [Authorized(ROLES.ADMIN)], // AdminユーザーはCRUDができるようにする
  },
  InterstitialBanner: {
    _all: [Authorized(ROLES.ADMIN)], // AdminユーザーはCRUDができるようにする
  },
  PaidTournament: {
    // Adminユーザーは登録更新ができるようにする
    createOnePaidTournament: [Authorized(ROLES.ADMIN)],
    updateOnePaidTournament: [Authorized(ROLES.ADMIN)],
  },
};

GeneratedResolvers.forEach((v) => {
  Service()(v);
});
