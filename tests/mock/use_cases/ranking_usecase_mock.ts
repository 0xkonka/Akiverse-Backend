import {
  RankingId,
  RankingUseCase,
} from "../../../src/use_cases/ranking_usecase";
import { Context } from "../../../src/context";
import { Craft } from "@prisma/client";
import { Rankings } from "../../../src/helpers/ranking";

export class RankingUseCaseMock implements RankingUseCase {
  returnValueForGetRanking: null | Rankings = null;
  throwErrorForGetRanking: any = null;
  reset() {
    this.returnValueForGetRanking = null;
    this.throwErrorForGetRanking = null;
  }
  craft(ctx: Context, craft: Craft): Promise<void> {
    return Promise.resolve(undefined);
  }

  finishPlaySession(ctx: Context, playSessionId: string): Promise<void> {
    return Promise.resolve(undefined);
  }

  async getRanking(
    ctx: Context,
    rankingId: RankingId,
    now: Date,
  ): Promise<Rankings> {
    if (this.throwErrorForGetRanking) throw this.throwErrorForGetRanking;
    if (!this.returnValueForGetRanking) throw Error("setup error");
    return this.returnValueForGetRanking;
  }
}
