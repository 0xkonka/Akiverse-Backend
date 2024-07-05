import { ArcadePartUseCase } from "../../../src/use_cases/arcade_part_usecase";
import { Context } from "../../../src/context";
import { ArcadePart } from "@prisma/client";

export class ArcadePartUseCaseMock implements ArcadePartUseCase {
  returnValueForWithdraw: ArcadePart[] | null = null;
  throwErrorForWithdraw: any | null = null;

  returnValueForDeposit: ArcadePart[] | null = null;
  throwErrorForDeposit: any | null = null;

  reset() {
    this.returnValueForWithdraw = null;
    this.returnValueForDeposit = null;
    this.throwErrorForWithdraw = null;
    this.throwErrorForDeposit = null;
  }
  async withdraw(ctx: Context, ...ids: string[]): Promise<ArcadePart[]> {
    if (this.throwErrorForWithdraw) throw this.throwErrorForWithdraw;
    if (!this.returnValueForWithdraw) throw new Error("setup error");
    return this.returnValueForWithdraw;
  }

  async deposit(
    ctx: Context,
    hash: string,
    ...ids: string[]
  ): Promise<ArcadePart[]> {
    if (this.throwErrorForDeposit) throw this.throwErrorForDeposit;
    if (!this.returnValueForDeposit) throw new Error("setup error");
    return this.returnValueForDeposit;
  }
}
