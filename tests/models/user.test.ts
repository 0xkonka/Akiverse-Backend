import prisma from "../../src/prisma";
import { Prisma } from "@prisma/client";
import { createUser, eraseDatabase } from "../test_helper";

describe("user", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  describe("akirBalance", () => {
    test("十分に大きい数値を保存できる", async () => {
      const akirBalance = new Prisma.Decimal(2).pow(256);
      await createUser({ akirBalance });
      const user = await prisma.user.findFirstOrThrow();
      expect(
        user.akirBalance.equals(
          "115792089237316195423570985008687907853269984665640564039457584007913129639936",
        ),
      ).toBe(true);
    });
  });
});
