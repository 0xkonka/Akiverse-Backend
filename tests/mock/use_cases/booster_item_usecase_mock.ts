import {
  $Enums,
  ActiveBooster,
  ActiveBoosterForTournament,
} from "@prisma/client";
import { Context } from "../../../src/context";
import { BoosterItemUseCase } from "../../../src/use_cases/booster_item_usecase";

export class BoosterItemUseCaseMock implements BoosterItemUseCase {
  returnValueForApply: ActiveBooster | ActiveBoosterForTournament | null = null;
  throwErrorForApply: any | null = null;
  reset() {
    this.returnValueForApply = null;
    this.throwErrorForApply = null;
  }
  async apply(
    ctx: Context,
    boosterItemId: string,
    paidTournamentId?: string | undefined,
  ): Promise<
    | {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        endAt: Date;
        category: $Enums.BoosterCategory;
        subCategory: string;
        userId: string;
      }
    | {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        endAt: Date;
        category: $Enums.BoosterCategory;
        subCategory: string;
        userId: string;
        paidTournamentId: string;
      }
  > {
    if (this.throwErrorForApply) throw this.throwErrorForApply;
    if (!this.returnValueForApply) throw new Error("setup failed");
    return this.returnValueForApply;
  }
}
