import {
  ACCESS_TOKEN_SECRET,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_PROJECT_ID,
  GOOGLE_PLAY_CLIENT_EMAIL,
  GOOGLE_PLAY_CLIENT_KEY,
  getAkiverseManagerUserId,
} from "../../constants";

export function validateEnvironmentVariables(): void {
  if (ACCESS_TOKEN_SECRET === "") {
    throw new Error(
      "Missing required environment variables. ['ACCESS_TOKEN_SECRET']",
    );
  }

  if (getAkiverseManagerUserId() === "") {
    throw new Error(
      "Missing required environment variables. ['AKIVERSE_MANAGER_USER_ID']",
    );
  }
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    // エミュレーター利用時はチェックしない
    if (
      FIREBASE_PROJECT_ID === "" ||
      FIREBASE_CLIENT_EMAIL === "" ||
      FIREBASE_PRIVATE_KEY === ""
    ) {
      throw new Error(
        "Missing required environment variables.['FIREBASE_PROJECT_ID','FIREBASE_CLIENT_EMAIL','FIREBASE_PRIVATE_KEY']",
      );
    }
  }

  if (GOOGLE_PLAY_CLIENT_EMAIL === "") {
    throw new Error(
      "Missing required environment variables. ['GOOGLE_PLAY_CLIENT_EMAIL']",
    );
  }

  if (GOOGLE_PLAY_CLIENT_KEY === "") {
    throw new Error(
      "Missing required environment variables. ['GOOGLE_PLAY_CLIENT_KEY']",
    );
  }
}
