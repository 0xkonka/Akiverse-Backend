import { MetadataUseCaseImpl } from "../../../../../../src/use_cases/metadata_usecase";
import { Container } from "typedi";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { authChecker } from "../../../../../mock/auth_checker";
import { resolvers } from "@generated/type-graphql";
import { graphql } from "graphql";
import { GameId, games } from "../../../../../../src/metadata/games";
import { Games } from "../../../../../../src/apps/server/apis/resolvers/outputs/game";
import { createMockContext } from "../../../../../mock/context";
import { eraseDatabase } from "../../../../../test_helper";
import { globalLogger } from "../../../../../../src/logger";

const useCase = new MetadataUseCaseImpl();

Container.set("metadata.useCase", useCase);
const schema = buildSchemaSync({
  resolvers: [...resolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

describe("listGames", () => {
  const request = `
    query ListGames($version: String) {
      listGames(version: $version) {
        version
        games {
          id
          name
          publisherId
          recipe {
            minUpperCabinetGrade
            minLowerCabinetGrade
          }
          craftFee
          rarity {
            rom
            junk
          }
          hotGame
          enabled
          onlyTournament
        }
      }
    }
  `;
  async function send(params = {}): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        ...params,
      },
      contextValue: await createMockContext(),
    });
    return JSON.parse(JSON.stringify(result));
  }
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("get", async () => {
    const ret = await send();
    const listGames = ret.data.listGames as Games;

    expect(listGames.games).toHaveLength(Object.keys(games).length);
    const version = listGames.version;
    expect(version).not.toBeNull();
    listGames.games!.forEach((v) => {
      expect(v.id).not.toBeNull();
      expect(v.name).not.toBeNull();
      expect(v.recipe).not.toBeNull();
      expect(v.onlyTournament).not.toBeNull();
    });

    const ret2 = await send({ version: version });
    expect(ret2.data.listGames).toBeNull();

    const ret3 = await send({ version: "ignore_version" });
    expect(ret3.data.listGames).toMatchObject(listGames);
  });
});
