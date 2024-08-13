import { Container, Service } from "typedi";
import { RankingUseCaseImpl } from "../../use_cases/ranking_usecase";
import { QuestProgressChecker } from "../../helpers/quests";
import ArcadeMachineUseCaseImpl from "../../use_cases/arcade_machine_usecase";
import { GameCenterUseCaseImpl } from "../../use_cases/game_center_usecase";
import ArcadePartUseCaseImpl from "../../use_cases/arcade_part_usecase";
import { MetadataUseCaseImpl } from "../../use_cases/metadata_usecase";
import { UnsubscribeUseCaseImpl } from "../../use_cases/unsubscribe_usecase";
import { CraftUseCaseImpl } from "../../use_cases/craft_usecase";
import { PlayGameUseCaseImpl } from "../../use_cases/play_game_usecase";
import { WalletAddressUseCaseImpl } from "../../use_cases/wallet_address_usecase";
import { ProfilePictureNftUseCaseImpl } from "../../use_cases/eth_nfts/profile_picture_nft_usecase";
import { UserUseCaseImpl } from "../../use_cases/user_usecase";
import { LoginUseCaseImpl } from "../../use_cases/login_usecase";
import { ExtractUseCaseImpl } from "../../use_cases/extract_usecase";
import { JunkUseCaseImpl } from "../../use_cases/junk_usecase";
import { RewardUseCaseImpl } from "../../use_cases/reward_usecase";
import { QuestUseCaseImpl } from "../../use_cases/quest_usecase";
import { AKVUseCaseImpl } from "../../use_cases/currencies/akv_usecase";
import { ProcessingTransferUseCaseImpl } from "../../use_cases/processing_transfer_usecase";
import { RoviGameUseCaseImpl } from "../../use_cases/rovi_game_usecase";
import { GooglePlayUseCaseImpl } from "../../use_cases/in_app_purchases/google_play";
import { AppStoreConnectUseCaseImpl } from "../../use_cases/in_app_purchases/app_store_connect";
import {
  GOOGLE_PLAY_CLIENT_EMAIL,
  GOOGLE_PLAY_CLIENT_KEY,
  APP_STORE_CONNECT_KEY_ID,
  APP_STORE_CONNECT_KEY,
  APP_STORE_CONNECT_ISSUER_ID,
  APP_BUNDLE_ID,
  APP_STORE_CONNECT_ENVIRONMENT,
} from "../../constants";

import { GeneratedResolvers } from "./resolvers";
import { PaidTournamentUseCaseImpl } from "../../use_cases/paid_tournament_usecase";
import { BoosterItemUseCaseImpl } from "../../use_cases/booster_item_usecase";
import { ImageUploadUseCaseImpl } from "../../use_cases/image_upload_usecase";

/**
 * Dependencies injection setting
 */
export function inject() {
  // DI settings
  Container.set("ranking.useCase", new RankingUseCaseImpl());
  Container.set("questProgressChecker", new QuestProgressChecker());
  Container.set("arcadeMachine.useCase", new ArcadeMachineUseCaseImpl());
  Container.set("gameCenter.useCase", new GameCenterUseCaseImpl());
  Container.set("arcadePart.useCase", new ArcadePartUseCaseImpl());
  Container.set("metadata.useCase", new MetadataUseCaseImpl());
  Container.set("unsubscribe.useCase", new UnsubscribeUseCaseImpl());
  Container.set(
    "craft.useCase",
    new CraftUseCaseImpl(Container.get("ranking.useCase")),
  );
  const questProgressChecker = new QuestProgressChecker();
  Container.set("questProgressChecker", questProgressChecker);
  Container.set(
    "playGame.useCase",
    new PlayGameUseCaseImpl(
      questProgressChecker,
      Container.get("ranking.useCase"),
    ),
  );
  Container.set(
    "walletAddress.useCase",
    new WalletAddressUseCaseImpl(questProgressChecker),
  );
  const profilePictureNftUseCase = new ProfilePictureNftUseCaseImpl();
  Container.set("nfts.useCase", profilePictureNftUseCase);
  Container.set("user.useCase", new UserUseCaseImpl(profilePictureNftUseCase));
  Container.set("login.useCase", new LoginUseCaseImpl());
  Container.set("extract.useCase", new ExtractUseCaseImpl());
  Container.set("junk.useCase", new JunkUseCaseImpl());
  Container.set("reward.useCase", new RewardUseCaseImpl());
  Container.set("quest.useCase", new QuestUseCaseImpl());
  Container.set("currency.akv.useCase", new AKVUseCaseImpl());
  Container.set(
    "processingTransfer.useCase",
    new ProcessingTransferUseCaseImpl(),
  );
  Container.set("rovi.useCase", new RoviGameUseCaseImpl());
  Container.set(
    "google.useCase",
    new GooglePlayUseCaseImpl(GOOGLE_PLAY_CLIENT_EMAIL, GOOGLE_PLAY_CLIENT_KEY),
  );
  Container.set(
    "apple.useCase",
    new AppStoreConnectUseCaseImpl(
      APP_STORE_CONNECT_KEY_ID,
      APP_STORE_CONNECT_KEY,
      APP_STORE_CONNECT_ISSUER_ID,
      APP_BUNDLE_ID,
      APP_STORE_CONNECT_ENVIRONMENT,
    ),
  );
  Container.set(
    "paidTournament.useCase",
    new PaidTournamentUseCaseImpl(questProgressChecker),
  );
  Container.set("boosterItem.useCase", new BoosterItemUseCaseImpl());
  Container.set("imageUpload.useCase", new ImageUploadUseCaseImpl());

  // Prisma+type-graphql generated resolver default inject
  // https://github.com/MichalLytek/typegraphql-prisma/issues/63
  GeneratedResolvers.forEach((v) => {
    Service()(v);
  });
}
