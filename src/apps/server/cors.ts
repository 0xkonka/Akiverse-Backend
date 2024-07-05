import { CorsOptions } from "cors";

export function generateCorsOptions(): CorsOptions {
  const origins = Array<string>();
  // localhost
  if (process.env.ALLOW_LOCALHOST_ACCESS === "true") {
    origins.push("http://localhost:3000");
  }
  // Debug用のホスト
  if (process.env.DEBUG_CORS_HOST) {
    origins.push(process.env.DEBUG_CORS_HOST);
  }
  // 動いている環境のみ許可する
  if (process.env.ENV === "dev") {
    origins.push("https://world-manager.dev.akiverse.io");
    origins.push("https://game.dev.akiverse.io");
  } else if (process.env.ENV === "staging") {
    origins.push("https://world-manager.staging.akiverse.io");
    origins.push("https://game.staging.akiverse.io");
    // OdenCan開発で利用しているOrigin
    origins.push("http://54.168.160.54:8080");
  } else if (process.env.ENV === "production") {
    origins.push("https://world-manager.akiverse.io");
    origins.push("https://game.akiverse.io");
  }

  return {
    origin: origins,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      // Sentry設定
      "Baggage",
      "Sentry-trace",
    ],
    credentials: true,
    maxAge: 60,
    optionsSuccessStatus: 200,
    preflightContinue: false,
    methods: ["GET", "POST", "OPTIONS"],
  };
}
