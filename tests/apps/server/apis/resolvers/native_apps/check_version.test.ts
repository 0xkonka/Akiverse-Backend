import "reflect-metadata";

import { eraseDatabase } from "../../../../../test_helper";
import { buildSchemaSync } from "type-graphql";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { Container, Service } from "typedi";
import { authChecker } from "../../../../../mock/auth_checker";
import { graphql } from "graphql";
import prisma from "../../../../../../src/prisma";
import { createMockContextNonAuth } from "../../../../../mock/context";

const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

GeneratedResolvers.forEach((v) => {
  Service()(v);
});
describe("check version", () => {
  beforeAll(async () => {
    await eraseDatabase();
    await prisma.appVersion.createMany({
      data: [
        {
          os: "ANDROID",
          version: "under_review",
          underReview: true,
        },
        {
          os: "ANDROID",
          version: "not_review",
          underReview: false,
        },
        {
          os: "IOS",
          version: "under_review",
          underReview: true,
        },
        {
          os: "IOS",
          version: "not_review",
          underReview: false,
        },
      ],
    });
  });

  const request = `
  query CheckVersion($os: OperatingSystem, $version: String) {
    checkVersion(os: $os, version: $version) {
      debug
    }
  }
  `;

  async function send(args: {}): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        ...args,
      },
      contextValue: createMockContextNonAuth(),
    });
    return JSON.parse(JSON.stringify(result));
  }

  test("android debug version", async () => {
    const ret = await send({
      os: "ANDROID",
      version: "under_review",
    });
    expect(ret.data.checkVersion).toMatchObject({ debug: true });
  });
  test("android normal version", async () => {
    const ret = await send({
      os: "ANDROID",
      version: "not_review",
    });
    expect(ret.data.checkVersion).toMatchObject({ debug: false });
  });
  test("android no record", async () => {
    const ret = await send({
      os: "ANDROID",
      version: "no_record",
    });
    expect(ret.data.checkVersion).toMatchObject({ debug: false });
  });
  test("iOS debug version", async () => {
    const ret = await send({
      os: "IOS",
      version: "under_review",
    });
    expect(ret.data.checkVersion).toMatchObject({ debug: true });
  });
  test("iOS normal version", async () => {
    const ret = await send({
      os: "IOS",
      version: "not_review",
    });
    expect(ret.data.checkVersion).toMatchObject({ debug: false });
  });
  test("iOS no record", async () => {
    const ret = await send({
      os: "IOS",
      version: "no_record",
    });
    expect(ret.data.checkVersion).toMatchObject({ debug: false });
  });
});
