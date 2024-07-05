import { createMockContext, createMockContextNonAuth } from "../mock/context";
import { incrementAccessCount } from "../../src/helpers/increment_access_count";
import prisma from "../../src/prisma";
import { eraseDatabase } from "../test_helper";

describe("save access log", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("save", async () => {
    const ctx = await createMockContext();
    expect(ctx.userId).not.toBeNull();
    const before = await prisma.accessLog.findMany({});
    expect(before).toHaveLength(0);
    // 初回
    await incrementAccessCount(ctx);
    const after = await prisma.accessLog.findMany({});
    expect(after).toHaveLength(1);
    expect(after[0].userId).toEqual(ctx.userId);
    expect(after[0].accessCount).toEqual(1);

    // 2回目
    await incrementAccessCount(ctx);
    const after2 = await prisma.accessLog.findMany({});
    expect(after2).toHaveLength(1);
    expect(after2[0].userId).toEqual(ctx.userId);
    expect(after2[0].accessCount).toEqual(2);
  });
  test("user not set", async () => {
    const ctx = createMockContextNonAuth();
    expect(ctx.userId).toBeUndefined();
    const before = await prisma.accessLog.findMany({});
    expect(before).toHaveLength(0);
    await incrementAccessCount(ctx);
    const after = await prisma.accessLog.findMany({});
    expect(after).toHaveLength(0);
  });
});
