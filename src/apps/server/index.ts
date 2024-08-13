import "reflect-metadata"; // needed to import type-graphql generated code
import { existsSync } from "node:fs";

import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageDisabled,
} from "apollo-server-core";
import { buildSchema } from "type-graphql";
import CustomResolvers from "./apis/resolvers";
import {
  GeneratedResolvers,
  modelsEnhanceMap,
  resolverEnhanceMap,
} from "./resolvers";
import { Container } from "typedi";
import { authChecker } from "./auth";
import { ApolloServer } from "apollo-server-express";
import express from "express";
import * as Sentry from "@sentry/node";

import { errorHandler, handler } from "./apis/rest_apis/handlers";
import { generateCorsOptions } from "./cors";
import { graphQLAccessLogMiddlewareFn } from "../../logger";
import { bindRequestContext, createContext } from "../../context";
import { error, info } from "../../utils";
import { validateEnvironmentVariables } from "./environment";
import { errorInterceptor, formatErrorFunc } from "./errors";
import { BEDIND_PROXY, INCLUDE_ERROR_DETAIL } from "../../constants";
import compression from "compression";
import { sentryPlugin } from "./sentry";
import { redisClient } from "../../redis";
import { inject } from "./inject";
import path from "path";
import {
  applyModelsEnhanceMap,
  applyResolversEnhanceMap,
} from "@generated/type-graphql";

// 必須の環境変数チェック
validateEnvironmentVariables();

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.0001,
  });
}

function getViewsDir(): string {
  const attempts = [
    "/app/src/apps/server/views",
    "/app/views",
    path.join(__dirname, "/views"),
  ];
  for (const attempt of attempts) {
    const exists = existsSync(attempt);
    if (exists) {
      return attempt;
    }
  }
  return attempts[0];
}

async function startServer() {
  // 必須の環境変数チェック
  validateEnvironmentVariables();

  // DI
  inject();
  applyModelsEnhanceMap(modelsEnhanceMap);
  applyResolversEnhanceMap(resolverEnhanceMap);

  await redisClient.on("error", (err) => error(err)).connect();

  const app = express();
  app.disable("x-powered-by");
  if (BEDIND_PROXY) {
    // ALB + CloudFrontと最低2ホップするため
    app.set("trust proxy", 2);
  }

  const comp = compression();
  app.use(comp);

  // CORS settings
  const corsOptions = generateCorsOptions();

  // The request handler must be the first middleware on the app
  app.use(Sentry.Handlers.requestHandler() as express.RequestHandler);

  // Template engine
  app.set("view engine", "ejs");
  const viewDir = getViewsDir();
  info({ msg: "determine views directory", __dirname, viewDir });
  app.set("views", viewDir);

  // Health Check
  app.get("/health", (req, res) => {
    res.send("ok");
  });

  app.use("/?", bindRequestContext);

  // Setup Rest API Handlers
  handler(app);

  try {
    const schema = await buildSchema({
      resolvers: [...GeneratedResolvers, ...CustomResolvers],
      container: Container,
      authChecker: authChecker,
      globalMiddlewares: [graphQLAccessLogMiddlewareFn, errorInterceptor],
    });
    let landingPageConfig;
    if (process.env.ENV === "production") {
      landingPageConfig = ApolloServerPluginLandingPageDisabled();
    } else {
      landingPageConfig = ApolloServerPluginLandingPageLocalDefault({
        embed: true,
        includeCookies: true,
      });
    }
    const apolloServer = new ApolloServer({
      schema,
      csrfPrevention: true,
      context: createContext,
      cache: "bounded",
      formatError: formatErrorFunc,
      debug: INCLUDE_ERROR_DETAIL,
      plugins: [landingPageConfig, sentryPlugin],
    });
    await apolloServer.start();
    apolloServer.applyMiddleware({ app, path: "/graphql", cors: corsOptions });

    // The error handler must be before any other error middleware and after all controllers
    app.use(Sentry.Handlers.errorHandler() as express.ErrorRequestHandler);
    app.use(errorHandler);

    const httpServer = app.listen({ port: 4000 }, () => {
      info({ msg: "graphql server on http://localhost:4000/graphql" });
    });
    // ALBのアイドルタイムアウトより長くする
    httpServer.keepAliveTimeout = 70000;
  } catch (e) {
    error({
      err: JSON.stringify(e, Object.getOwnPropertyNames(e)),
    });
    await redisClient.disconnect();
  }
}

startServer();
