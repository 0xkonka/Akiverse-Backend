import { CurrencyType, NftType, Prisma } from "@prisma/client";
import { asPartial, parseBoolean } from "./utils";
import { Network } from "alchemy-sdk";
import { CraftCurrencyType } from "./use_cases/craft_usecase";
import { ExtractCurrencyType } from "./use_cases/extract_usecase";
import { DismantleCurrencyType } from "./use_cases/arcade_machine_usecase";
import path from "path";
import { existsSync, readFileSync } from "node:fs";
import { Environment } from "@apple/app-store-server-library";
//
// ブロックを認証するために必要な子孫ブロック数
// 参考リンク：
// https://polygonscan.com/blocks_forked
// 今まで最長のChain Reorganizationはブロック数25227321から始めます。
// そのRe-Org Depthは194です。
// 現在のConfirmerは、一度認証されたブロックを巻き戻すロジックは未実装
// ですので、BLOCKS_TO_CONFIRMを超えるchain reorganizationが起こす際に
// 手動でDB上のblocksやその関連のtransfer等の修正が必要になる。
// その時、安全のためダウンタイムが必要になると思っています。
// １年以内にこんなケースが起こる可能性は低くないので、ベータが終わる
// までに対応すれば幸いです。
// ちなみに２０２３年２月１３日にブロック数39259033から始まるRe-Org
// Depthが21のchain reorganizationがありますた。これはちゃんと
// akiverse_productionのDBに映るので、「Reorganizationはネットワークの
// 縁で起こりますが、AlchemyのRPC Providerまで届かない」と言う推測は
// 怪しいと思っています。
export const BLOCKS_TO_CONFIRM = 200;

// セッショントークンをDBに入れ込む際にハッシュ関数に使用するソルト暗号
export const SESSION_TOKEN_SALT =
  "f3082958df6eb8a66589f579b1565d182e5af448512ebd8b5a165c3f86b6d6f7";
// セッションの有効期間（日）
export const SESSION_DURATION_DAYS = 60;
// セッション種類を区別する接頭字
export const MORALIS_SESSION_PREFIX = "01";
export const MAGIC_SESSION_PREFIX = "02";
export const GAME_PLAY_SESSION_PREFIX = "03";

export const NFT_ADDRESSES: Partial<Record<NftType, string>> = asPartial({
  [NftType.GAME_CENTER]: process.env.GAME_CENTERS_CONTRACT_ADDRESS,
  [NftType.ARCADE_MACHINE]: process.env.ARCADE_MACHINES_CONTRACT_ADDRESS,
  [NftType.ARCADE_PART]: process.env.ARCADE_PARTS_CONTRACT_ADDRESS,
});

// 有料トーナメントの賞金送付に使うUSDCのコントラクトアドレス
let usdcContractAddress;
if (process.env.ENV === "production") {
  // Polygon上にデプロイされたUSDCのコントラクトアドレス
  // https://polygonscan.com/token/0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
  usdcContractAddress = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
} else {
  // AmoyにデプロイしたモックのContractアドレス https://amoy.polygonscan.com/token/0xf01816c0ea1d936a3ded74e09eecc4237007ee41
  usdcContractAddress = "0xF01816c0Ea1d936A3DEd74E09EECC4237007EE41";
}

export const FT_ADDRESSES: Partial<Record<CurrencyType, string>> = asPartial({
  [CurrencyType.AKIR]: process.env.AKIR_CONTRACT_ADDRESS,
  [CurrencyType.AKV]: process.env.AKV_CONTRACT_ADDRESS,
  [CurrencyType.USDC]: usdcContractAddress,
});

export const AKIVERSE_LOCKER_ADDRESS: string =
  process.env.AKIVERSE_LOCKER_ADDRESS || "missing address";

export const ALCHEMY_API_KEY: string = process.env.ALCHEMY_API_KEY || "";

export const JSON_RPC_PROVIDER: string = process.env.JSON_RPC_PROVIDER || "";

const envPlayTimeoutSeconds = parseInt(process.env.PLAY_TIMEOUT_SECONDS || "");
export const PLAY_TIMEOUT_SECONDS = Number.isInteger(envPlayTimeoutSeconds)
  ? envPlayTimeoutSeconds
  : 10;

const envPlaySessionReadyTimeoutSeconds = parseInt(
  process.env.PLAY_SESSION_READY_TIMEOUT_SECONDS || "",
);
export const PLAY_SESSION_READY_TIMEOUT_SECONDS = Number.isInteger(
  envPlaySessionReadyTimeoutSeconds,
)
  ? envPlaySessionReadyTimeoutSeconds
  : 30;

// TODO スパーク時にAMのENERGYに加算する値
export const SPARKED_ENERGY = 4000;

// TODO メガスパーク時に配布されるTeras数
export const MEGA_SPARKED_REWARD = new Prisma.Decimal(500);

// TODO メガスパーク状態で配布されるTerasの合計。AMOとプレイヤーで比率(SPARKED_TERAS_DISTRIBUTION_RATIO_TO_PLAYER)で分配
export const FEVER_SPARKED_REWARD_TOTAL = new Prisma.Decimal(200);

// あと何回加算されるとMegaSpark状態にするか
export const MEGA_SPARK_UPCOMING_COUNT = 1;

// TODO スパーク時に発生するTerasのプレーヤーに分配する比率 現状はOwnerとPlayerで50:50
export const SPARKED_TERAS_DISTRIBUTION_RATIO_TO_PLAYER = 0.5;

const gasPriceAdjustmentRatio = parseFloat(
  process.env.GAS_PRICE_ADJUSTMENT_RATIO || "",
);
export const GAS_PRICE_ADJUSTMENT_RATIO = Number.isNaN(gasPriceAdjustmentRatio)
  ? 1.0
  : gasPriceAdjustmentRatio;

// FIXME 1日設置した場合の設置料金
export const INSTALLATION_FEE_OF_DAY = new Prisma.Decimal(120);

export const TERM_TIME_ZONE = "Asia/Tokyo";

// craftのベース料金
export const CRAFT_BASE_FEE = new Prisma.Decimal(5000);

const AKV_UNIT = new Prisma.Decimal(10).pow(18);

export const CRAFT_BASE_FEES: Record<CraftCurrencyType, Prisma.Decimal> = {
  AKV: new Prisma.Decimal(8).mul(AKV_UNIT),
  TERAS: new Prisma.Decimal(5000),
};

let domain;
let uri;
let behindProxy = true;
let isLocal = false;
switch (process.env.ENV) {
  case "dev":
    domain = "world-manager.dev.akiverse.io";
    uri = "https://" + domain;
    break;
  case "staging":
    domain = "world-manager.staging.akiverse.io";
    uri = "https://" + domain;
    break;
  case "production":
    domain = "world-manager.akiverse.io";
    uri = "https://" + domain;
    break;
  default:
    domain = "localhost:3000";
    uri = "http://" + domain;
    behindProxy = false;
    isLocal = true;
}

export const LOCAL_DEVELOPMENT = isLocal;

export const AKIVERSE_DOMAIN = domain;
export const WORLD_MANAGER_URI = uri;

// ALB/CloudFront配下にある場合はtrueが設定される
export const BEDIND_PROXY = behindProxy;

export const ETH_NETWORK =
  process.env.ENV === "production" ? Network.ETH_MAINNET : Network.ETH_GOERLI;

// CBT2 運営が保有するAMを識別するために持つ
const AKIVERSE_MANAGER_USER_ID: string =
  process.env.AKIVERSE_MANAGER_USER_ID || "";

export function getAkiverseManagerUserId(): string {
  return AKIVERSE_MANAGER_USER_ID;
}

// accessToken sign secret
export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "";

export const EXTRACT_FEES: Record<ExtractCurrencyType, Prisma.Decimal> = {
  TERAS: new Prisma.Decimal(5000),
  AKV: new Prisma.Decimal(16).mul(AKV_UNIT),
};

export const INCLUDE_ERROR_DETAIL =
  parseBoolean(process.env.INCLUDE_ERROR_DETAIL) || false;

// PFP Contract address
// see: https://github.com/VictGame/akiverse-pfp-frontend/tree/main/deploy
export const PFP_CONTRACT_ADDRESS =
  process.env.ENV === "production"
    ? "0xBe4d3b56424ce0D7D755B6e8264559C845117c44"
    : "0xdfd8B885dbcD95745d71E5b9925d875515028C4e";

export const ETH_ALCHEMY_API_KEY: string =
  process.env.ETH_ALCHEMY_API_KEY || "";

// SDKから送信されてくるスコアの改ざんチェック用Key群
export const SCORE_SIGN_KEY_1 = "00BWR_l2OkcYcnVl-kTQCO3Wc_K8n4H7S0dhEqnTbdc";
export const SCORE_SIGN_KEY_2 = "Jk2IA9x9J_8F5QUv2PO5nXyFroy6s5HHEAb-AeRA290";

// FIXME watcherのRPCポーリング間隔
const bcPollIntervalMs = parseInt(process.env.BC_POLLING_INTERVAL || "");
export const BC_POLLING_INTERVAL_MS = Number.isNaN(bcPollIntervalMs)
  ? 100
  : bcPollIntervalMs;

// MegaSpark後にSparkできる最大回数
export const FEVER_SPARK_MAX_COUNT = 30;

export const DISMANTLE_FEES: Record<DismantleCurrencyType, Prisma.Decimal> = {
  // Dismantleの料金
  TERAS: new Prisma.Decimal(13000),
  AKV: new Prisma.Decimal(40).mul(AKV_UNIT),
};

const ROVI_WEBHOOK_DOMAIN = process.env.ROVI_WEBHOOK_DOMAIN || "";
export const ROVI_WEBHOOK_URL_BASE = ROVI_WEBHOOK_DOMAIN + "/contests";

export const ROVI_PLAY_TOKEN_SECRET = process.env.ROVI_PLAY_TOKEN_SECRET || "";

// Firebase admin SDKの認証情報
export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "";
export const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || "";
export const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY || "";

export const GOOGLE_PLAY_CLIENT_EMAIL =
  process.env.GOOGLE_PLAY_CLIENT_EMAIL || "";

export const GOOGLE_PLAY_CLIENT_KEY = process.env.GOOGLE_PLAY_CLIENT_KEY || "";

// 1TicketのTeras換算レート
export const TICKET_PER_TERAS_RATE = 100;

// 1000Terasで1USDC
export const TERAS_TO_USD_RATE = 0.001;

// 1.6Terasで1IDR
export const TERAS_TO_IDR_RATE = 16;

// PaidTournamentResultに保存する下限順位
export const PAID_TOURNAMENT_RESULT_RECORD_MINIMUM_RANK = 20;

// Watcherでトランザクションを保存する際にUSDCの場合は自身から送ったものだけにフィルタする必要があるため、ウォレットアドレスが必要
export const USDC_WALLET_ADDRESS = process.env.USDC_WALLET_ADDRESS || "";

// USDCをCurrencyWithdrawalに入れる際に少数がなくなってしまうので、調整するための係数
export const USDC_DECIMAL_ALIGNMENT_FACTOR = new Prisma.Decimal(100);

// 画像リソースのベースURL
export const IMAGE_ASSET_URL_BASE = process.env.IMAGE_ASSET_URL_BASE || "";

// 画像リソースを配置するS3のバケット名
export const IMAGE_ASSET_S3_BUCKET_NAME =
  process.env.IMAGE_ASSET_S3_BUCKET_NAME || "";

// アセット用バケットのリージョン
export const IMAGE_ASSET_S3_BUCCKET_REGION = "us-east-1";

// iOSの設定
export const APP_STORE_CONNECT_KEY_ID =
  process.env.APP_STORE_CONNECT_KEY_ID || "";
export const APP_STORE_CONNECT_KEY = process.env.APP_STORE_CONNECT_KEY || "";

export const APP_STORE_CONNECT_ISSUER_ID =
  process.env.APP_STORE_CONNECT_ISSUER_ID || "";
export const APP_BUNDLE_ID = "io.akiverse.akiverse";
export const APP_STORE_CONNECT_ENVIRONMENT: Environment =
  (process.env.APP_STORE_CONNECT_ENVIRONMENT as any as Environment) ||
  Environment.LOCAL_TESTING;

// apple root certificates
// downloaded from https://www.apple.com/certificateauthority/
function getCertsDir(): string {
  const attempts = ["/app/certs", path.join(__dirname, "../certs")];
  for (const attempt of attempts) {
    const exists = existsSync(attempt);
    if (exists) {
      return attempt;
    }
  }
  return attempts[0];
}
const certsDir = getCertsDir();

const appleRootCertificatePaths = [
  "AppleRootCA-G2.cer",
  "AppleRootCA-G3.cer",
].map((filename) => path.join(certsDir, filename));

export const APPLE_ROOT_CERTIFICATES = appleRootCertificatePaths.map(
  (certPath) => readFileSync(certPath),
);
