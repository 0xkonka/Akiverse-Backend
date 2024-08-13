import "reflect-metadata";

import { GameCenterMetadataHandler } from "./metadata/game_center_handler";
import express, { NextFunction, Request, Response } from "express";
import { Container } from "typedi";
import { MetadataUseCase } from "../../../../../use_cases/metadata_usecase";
import { UnsubscribeUseCase } from "../../../../../use_cases/unsubscribe_usecase";
import { constants } from "http2";
import { HandlerError, toHandlerError } from "../errors";
import { asyncWrapper } from "./wrapper";
import { ArcadePartMetadataHandler } from "./metadata/arcade_part_handler";
import { ArcadeMachineMetadataHandler } from "./metadata/arcade_machine_handler";
import { UnsubscribeHandler } from "./unsubscribe/unsubscribe_handler";
import getContext from "../../../../../context";
import { SPNPayHandler } from "./notify/spnpay_handler";

const METADATA_ENDPOINT_PREFIX = "/metadata";
const METADATA_ENDPOINT_SUFFIX = "/:id.json";

export function handler(app: express.Application) {
  const metadataUseCase = Container.get<MetadataUseCase>("metadata.useCase");
  const unsubscribeUseCase = Container.get<UnsubscribeUseCase>(
    "unsubscribe.useCase",
  );
  const gameCenterMetadataHandler = new GameCenterMetadataHandler(
    metadataUseCase,
  );
  const arcadePartsMetadataHandler = new ArcadePartMetadataHandler(
    metadataUseCase,
  );
  const arcadeMachineMetadataHandler = new ArcadeMachineMetadataHandler(
    metadataUseCase,
  );
  const unsubscribeHandler = new UnsubscribeHandler(unsubscribeUseCase);
  const spnPayHandler = new SPNPayHandler();
  // Metadata Handlers
  app.get(
    `${METADATA_ENDPOINT_PREFIX}/gamecenters/:size/:index/metadata.json`,
    // eslint-disable-next-line @typescript-eslint/no-misused-promises,@typescript-eslint/unbound-method
    asyncWrapper(gameCenterMetadataHandler.get),
  );
  app.get(
    `${METADATA_ENDPOINT_PREFIX}/arcadeparts${METADATA_ENDPOINT_SUFFIX}`,
    // eslint-disable-next-line @typescript-eslint/no-misused-promises,@typescript-eslint/unbound-method
    asyncWrapper(arcadePartsMetadataHandler.get),
  );
  app.get(
    `${METADATA_ENDPOINT_PREFIX}/arcademachines${METADATA_ENDPOINT_SUFFIX}`,
    // eslint-disable-next-line @typescript-eslint/no-misused-promises,@typescript-eslint/unbound-method
    asyncWrapper(arcadeMachineMetadataHandler.get),
  );
  app.get(
    "/email/unsubscribe",
    // eslint-disable-next-line @typescript-eslint/no-misused-promises,@typescript-eslint/unbound-method
    asyncWrapper(unsubscribeHandler.get),
  );
  app.post(
    "/email/unsubscribe",
    // eslint-disable-next-line @typescript-eslint/no-misused-promises,@typescript-eslint/unbound-method
    asyncWrapper(unsubscribeHandler.post),
  );
  app.use(express.json());
  app.post("/notify/spnpay", asyncWrapper(spnPayHandler.post));
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _: NextFunction,
) {
  const ctx = getContext(req);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  err = toHandlerError(err);
  ctx?.log.error(err, "handled error");
  if (err instanceof HandlerError) {
    res.status(err.statusCode).send(err.message).end();
    return;
  }
  res
    .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
    .send("INTERNAL ERROR")
    .end();
}
