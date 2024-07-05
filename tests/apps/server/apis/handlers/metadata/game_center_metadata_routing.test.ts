import request from "supertest";
import express from "express";
import {
  errorHandler,
  handler,
} from "../../../../../../src/apps/server/apis/rest_apis/handlers";
import { MetadataUseCaseImpl } from "../../../../../../src/use_cases/metadata_usecase";
import Container from "typedi";
import { GameCenter, GameCenterArea, GameCenterSize } from "@prisma/client";
import prisma from "../../../../../../src/prisma";
import { getGameCenterId } from "../../../../../../src/helpers/game_centers";
import { eraseDatabase } from "../../../../../test_helper";
import { bindRequestContext } from "../../../../../../src/context";

async function createGameCenter(extraData = {}): Promise<GameCenter> {
  return await prisma.gameCenter.create({
    data: {
      name: "test",
      id: getGameCenterId(1, 123), // 10000000000000000000000000000000000000000000000000000000000000000000000000123
      size: GameCenterSize.SMALL,
      xCoordinate: 10,
      yCoordinate: 20,
      area: GameCenterArea.AKIHABARA,
      ...extraData,
    },
  });
}

Container.set("metadata.useCase", new MetadataUseCaseImpl());

const app = express();
app.use("/?", bindRequestContext);
handler(app);
app.use(errorHandler);

describe("GameCenter routing", () => {
  beforeEach(async () => {
    await eraseDatabase();
    await createGameCenter();
  });
  test("Success", async () => {
    const res = await request(app).get(
      "/metadata/gamecenters/01/123/metadata.json",
    );
    console.log({ res });
    expect(res.status).toEqual(200);
    expect(JSON.parse(res.text).animation_url).toEqual(
      "https://assets.akiverse.io/gamecenters/akihabara/small.mp4",
    );
  });
  test("Invalid path", async () => {
    const res = await request(app).get(
      "/metadata/gamecenters/10000000000000000000000000000000000000000000000000000000000000000000000000123.json",
    );
    expect(res.status).toEqual(404);
  });
  test("Nonexistent GC", async () => {
    const res = await request(app).get(
      "/metadata/gamecenters/01/100/metadata.json",
    );
    expect(res.status).toEqual(404);
  });
});
