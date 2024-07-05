import { withdrawAkv } from "../../src/helpers/withdraw";
import { eraseDatabase, createUser } from "../test_helper";
import { Prisma } from "@prisma/client";

describe("withdrawAkv", () => {
  beforeEach(eraseDatabase);

  it("can withdraw", async () => {
    // User作成
    const user = await createUser({ akvBalance: new Prisma.Decimal("100") });
    // Withdrawを実行
    const currencyWithdrawal = await withdrawAkv(
      user,
      new Prisma.Decimal("30"),
    );
    expect(currencyWithdrawal).toMatchObject({
      currencyType: "AKV",
      amount: new Prisma.Decimal("30"),
      state: "UNPROCESSED",
      userId: user.id,
      walletAddress: user.walletAddress,
    });
  });

  it("cannot withdraw without a walletAddress", async () => {
    // User作成
    const user = await createUser({
      walletAddress: null,
      akvBalance: new Prisma.Decimal("100"),
    });
    // Withdrawを実行
    await expect(withdrawAkv(user, new Prisma.Decimal("30"))).rejects.toThrow(
      "walletAddress is not set",
    );
  });

  it("cannot withdraw more than balance", async () => {
    // User作成
    const user = await createUser({
      akvBalance: new Prisma.Decimal("100"),
    });
    // Withdrawを実行
    await expect(withdrawAkv(user, new Prisma.Decimal("200"))).rejects.toThrow(
      "AKV200を保有していません",
    );
  });
});
