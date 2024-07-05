import { MetadataUseCaseMock } from "../../../../../mock/use_cases/metadata_usecase_mock";
import request from "supertest";
import express from "express";
import { errorHandler } from "../../../../../../src/apps/server/apis/rest_apis/handlers";
import { asyncWrapper } from "../../../../../../src/apps/server/apis/rest_apis/handlers/wrapper";
import { NotFoundUseCaseError } from "../../../../../../src/use_cases/errors";
import { ArcadePartMetadataHandler } from "../../../../../../src/apps/server/apis/rest_apis/handlers/metadata/arcade_part_handler";

const app = express();

const useCase = new MetadataUseCaseMock();
const handler = asyncWrapper(new ArcadePartMetadataHandler(useCase).get);

app.get("/test/:id.json", handler);
app.use(errorHandler);

describe("game center metadata", () => {
  beforeEach(() => {
    useCase.reset();
  });
  test("success", async () => {
    useCase.returnArcadePartValue = {
      name: "dummy name",
      description: "dummy description",
      image: "https://dummy.image/",
      animation_url: "https://dummy.animation/",
      external_url: "https://dummy.external/",
      attributes: [{ trait_type: "Type", value: "ROM" }],
    };

    const res = await request(app).get("/test/1.json");

    expect(res.status).toEqual(200);
    expect(JSON.stringify(res.body)).toEqual(
      JSON.stringify(useCase.returnArcadePartValue),
    );
  });
  test("not found", async () => {
    useCase.throwArcadePartError = new NotFoundUseCaseError(
      "test",
      "ArcadeParts",
    );
    const res = await request(app).get("/test/1.json");
    expect(res.status).toEqual(404);
  });
  test("useCase inner unknown error", async () => {
    useCase.throwArcadePartError = new Error("test");
    const res = await request(app).get("/test/1.json");
    expect(res.status).toEqual(500);
  });
});
