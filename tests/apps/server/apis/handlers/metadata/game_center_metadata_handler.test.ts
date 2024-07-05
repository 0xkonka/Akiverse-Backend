import { MetadataUseCaseMock } from "../../../../../mock/use_cases/metadata_usecase_mock";
import { GameCenterMetadataHandler } from "../../../../../../src/apps/server/apis/rest_apis/handlers/metadata/game_center_handler";

import request from "supertest";
import express from "express";
import { errorHandler } from "../../../../../../src/apps/server/apis/rest_apis/handlers";
import { asyncWrapper } from "../../../../../../src/apps/server/apis/rest_apis/handlers/wrapper";
import { NotFoundUseCaseError } from "../../../../../../src/use_cases/errors";

const app = express();

const useCase = new MetadataUseCaseMock();
const handler = asyncWrapper(new GameCenterMetadataHandler(useCase).get);

// app.get("/test/:id.json", handler);
app.get("/test/:size/:index/metadata.json", handler);
app.use(errorHandler);

describe("game center metadata", () => {
  beforeEach(() => {
    useCase.reset();
  });
  test("success", async () => {
    useCase.returnGameCenterValue = {
      name: "dummy name",
      description: "dummy description",
      image: "https://dummy.image/",
      animation_url: "https://dummy.animation/",
      external_url: "https://dummy.external/",
      attributes: [{ trait_type: "Area", value: "AKIBAHARA" }],
    };

    const res = await request(app).get("/test/01/23/metadata.json");

    expect(res.status).toEqual(200);
    expect(JSON.stringify(res.body)).toEqual(
      JSON.stringify(useCase.returnGameCenterValue),
    );
  });
  test("not found", async () => {
    useCase.throwGameCenterError = new NotFoundUseCaseError(
      "test",
      "GameCenter",
    );
    const res = await request(app).get("/test/01/23/metadata.json");
    expect(res.status).toEqual(404);
  });
  test("useCase inner unknown error", async () => {
    useCase.throwGameCenterError = new Error("test");
    const res = await request(app).get("/test/01/23/metadata.json");
    expect(res.status).toEqual(500);
  });
});
