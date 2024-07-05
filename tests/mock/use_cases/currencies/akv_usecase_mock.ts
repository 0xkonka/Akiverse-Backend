import { AKVUseCase } from "../../../../src/use_cases/currencies/akv_usecase";
import { Context } from "vm";
import { Prisma } from "@prisma/client";

export class AKVUseCaseMock implements AKVUseCase {
  throwErrorForDeposit: any | null = null;
  throwErrorForWithdraw: any | null = null;
  reset() {
    this.throwErrorForDeposit = null;
    this.throwErrorForWithdraw = null;
  }
  async deposit(
    ctx: Context,
    transactionHash: string,
    amount: Prisma.Decimal,
  ): Promise<void> {
    if (this.throwErrorForDeposit) throw this.throwErrorForDeposit;
    return;
  }

  async withdraw(ctx: Context, amount: Prisma.Decimal): Promise<void> {
    if (this.throwErrorForWithdraw) throw this.throwErrorForWithdraw;
    return;
  }
}
