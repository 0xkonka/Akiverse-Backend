import "reflect-metadata";

import { createUser, eraseDatabase } from "../../../../test_helper";
import { server } from "../resolvers/helper";
import { Prisma } from "@prisma/client";
import { ContextImpl } from "../../../../../src/context";
import prisma from "../../../../../src/prisma";
import { v4 as uuidv4 } from "uuid";
import { globalLogger } from "../../../../../src/logger";
import { ApolloServer } from "apollo-server-express";

describe("UserResolver", () => {
  let s: ApolloServer;
  beforeAll(async () => {
    await eraseDatabase();
    const user = await prisma.user.create({
      data: {
        name: "test",
        email: "test@test",
        walletAddress: uuidv4(),
        akirBalance: new Prisma.Decimal(10000),
        akvBalance: new Prisma.Decimal(20000),
        terasBalance: new Prisma.Decimal(30000),
      },
    });
    s = await server(async () => {
      const ctx = new ContextImpl(
        prisma,
        globalLogger.child(globalLogger.bindings()),
      );
      ctx.accessToken = {
        tokenUse: "api",
        userId: user.id,
        walletAddress: user.walletAddress ? user.walletAddress : undefined,
        locked: false,
      };
      return ctx;
    });
  });
  afterAll(async () => {
    await eraseDatabase();
  });
  const request = `
    query{
      users {
        id
        walletAddress
        email
        akirBalance
        akvBalance
        terasBalance
      }
    }
    `;

  test("When referring to attributes other than your own", async () => {
    await createUser({
      akirBalance: new Prisma.Decimal(1000),
      akvBalance: new Prisma.Decimal(2000),
      terasBalance: new Prisma.Decimal(3000),
    });

    const result = await s.executeOperation({ query: request });
    expect(
      result.data?.users.map((u: any) => u.email).includes("[hidden]"),
    ).toBe(true);
    expect(
      result.data?.users.map((u: any) => u.akirBalance).includes("0"),
    ).toBe(true);
  });

  test("When referencing your own attributes", async () => {
    const result = await s.executeOperation({ query: request });
    expect(result.errors).toBeUndefined();
    const own = result.data?.users.find((v: { email: string }) => {
      return v.email === "test@test";
    });
    expect(own.email).toBe("test@test");
    expect(own.akirBalance).toBe("10000");
    expect(own.akvBalance).toBe("20000");
    expect(own.terasBalance).toBe("30000");
  });
});
