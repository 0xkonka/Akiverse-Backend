import { Context } from "../../../src/context";
import {
  RewardDetail,
  RewardUseCase,
} from "../../../src/use_cases/reward_usecase";

export class RewardUseCaseMock implements RewardUseCase {
  returnValue: RewardDetail[] | null = null;
  throwError: any | null = null;

  reset() {
    this.returnValue = null;
    this.throwError = null;
  }
  async acceptAll(ctx: Context): Promise<RewardDetail[]> {
    if (this.throwError) throw this.throwError;
    if (!this.returnValue) throw new Error("setup error");
    return this.returnValue;
  }
}
