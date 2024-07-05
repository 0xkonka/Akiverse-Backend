import { Prisma } from "@prisma/client";
import { withdrawAkir } from "../../src/helpers/withdraw";
import { eraseDatabase, createUser } from "../test_helper";

describe("withdrawAkir", () => {
  beforeEach(eraseDatabase);

  it("can withdraw", async () => {
    // User作成
    const user = await createUser({ akirBalance: new Prisma.Decimal("100") });
    // Withdrawを実行
    const currencyWithdrawal = await withdrawAkir(
      user,
      new Prisma.Decimal("30"),
    );
    expect(currencyWithdrawal).toMatchObject({
      currencyType: "AKIR",
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
      akirBalance: new Prisma.Decimal("100"),
    });
    // Withdrawを実行
    await expect(withdrawAkir(user, new Prisma.Decimal("30"))).rejects.toThrow(
      "walletAddress is not set",
    );
  });

  it("cannot withdraw more than balance", async () => {
    // User作成
    const user = await createUser({
      akirBalance: new Prisma.Decimal("100"),
    });
    // Withdrawを実行
    await expect(withdrawAkir(user, new Prisma.Decimal("200"))).rejects.toThrow(
      "AKIR200を保有していません",
    );
  });
});
