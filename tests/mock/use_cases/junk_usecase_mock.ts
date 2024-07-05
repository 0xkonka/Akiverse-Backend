import { JunkUseCase } from "../../../src/use_cases/junk_usecase";
import { ArcadePart, ArcadePartCategory } from "@prisma/client";
import { Context } from "vm";

export class JunkUseCaseMock implements JunkUseCase {
  returnValueForSwap: ArcadePart[] | null = null;
  throwErrorForSwap: any | null = null;

  reset(): void {
    this.returnValueForSwap = null;
    this.throwErrorForSwap = null;
  }

  async swap(
    ctx: Context,
    category: ArcadePartCategory,
    subCategory: string,
    quantity: number,
  ): Promise<ArcadePart[]> {
    if (this.throwErrorForSwap) throw this.throwErrorForSwap;
    if (!this.returnValueForSwap) throw Error("setup error");
    return this.returnValueForSwap;
  }
}
