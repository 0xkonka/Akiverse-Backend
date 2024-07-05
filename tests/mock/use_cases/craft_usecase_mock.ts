import { Context } from "../../../src/context";
import {
  CraftCurrencyType,
  CraftPartType,
  CraftUseCase,
} from "../../../src/use_cases/craft_usecase";
import { ArcadeMachine } from "@prisma/client";

export class CraftUseCaseMock implements CraftUseCase {
  returnValueForCraft: ArcadeMachine | null = null;
  throwErrorForCraft: any | null = null;
  reset() {
    this.returnValueForCraft = null;
    this.throwErrorForCraft = null;
  }
  async craft(
    ctx: Context,
    parts: CraftPartType[],
    currencyType: CraftCurrencyType,
  ): Promise<ArcadeMachine> {
    if (this.throwErrorForCraft) throw this.throwErrorForCraft;
    if (!this.returnValueForCraft) throw new Error("setup error");
    return this.returnValueForCraft;
  }
}
