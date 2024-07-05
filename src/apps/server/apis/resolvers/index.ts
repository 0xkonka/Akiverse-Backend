import ArcadeMachineOperationResolver from "./arcade_machine_resolver";
import ArcadePartOperationResolver from "./arcade_part_resolver";
import { GameResolver } from "./games/game_resolver";
import SdkResolver from "./sdk_resolver";
import { NonEmptyArray } from "type-graphql";
import CraftResolver from "./arcade_machines/craft_resolver";
import CustomArcadeMachineResolvers from "./arcade_machines";
import CustomUserResolvers from "./users";
import CustomAuthResolvers from "./auth";
import CustomJunkResolvers from "./junks";
import CustomExtractResolvers from "./extracts";
import CustomNotificationResolvers from "./notifications";
import CustomRewardResolvers from "./rewards";
import CustomCollectibleItemResolvers from "./collectible_items";
import CustomExternalNFTsResolvers from "./external_nfts";
import CustomQuestChainResolvers from "./quest_chains";
import CustomQuestResolvers from "./quests";
import CustomGameCenterResolvers from "./game_center";
import CustomCurrenciesResolvers from "./currencies";
import CustomTransferResolvers from "./transfers";
import CustomRankingResolvers from "./rankings";
import CustomBannerItemResolvers from "./banners";
import CustomNativeAppsResolvers from "./native_apps";
import RoviResolvers from "./rovi";
import inAppPurchaseResolvers from "./in_app_purchases";
import CustomPaidTournamentResolvers from "./paid_tournaments";
import CustomBoosterItemResolvers from "./booster_item";
import s3Resolvers from "./s3";

const CustomResolvers = [
  ArcadeMachineOperationResolver,
  ArcadePartOperationResolver,
  GameResolver,
  CraftResolver,
  SdkResolver,
  ...CustomArcadeMachineResolvers,
  ...CustomUserResolvers,
  ...CustomAuthResolvers,
  ...CustomJunkResolvers,
  ...CustomExtractResolvers,
  ...CustomNotificationResolvers,
  ...CustomRewardResolvers,
  ...CustomCollectibleItemResolvers,
  ...CustomExternalNFTsResolvers,
  ...CustomQuestChainResolvers,
  ...CustomQuestResolvers,
  ...CustomGameCenterResolvers,
  ...CustomCurrenciesResolvers,
  ...CustomTransferResolvers,
  ...CustomRankingResolvers,
  ...CustomBannerItemResolvers,
  ...CustomNativeAppsResolvers,
  ...RoviResolvers,
  ...inAppPurchaseResolvers,
  ...CustomPaidTournamentResolvers,
  ...CustomBoosterItemResolvers,
  ...s3Resolvers,
] as unknown as NonEmptyArray<Function>;

export default CustomResolvers;
