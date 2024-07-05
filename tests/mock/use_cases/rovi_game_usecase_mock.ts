import { RoviGameUseCase } from "../../../src/use_cases/rovi_game_usecase";
import { Context } from "vm";

export class RoviGameUseCaseMock implements RoviGameUseCase {
  returnValueForFinish: boolean = false;

  async start(ctx: Context, data: string): Promise<string> {
    return "test_token";
  }
  async finish(
    ctx: Context,
    token: string,
    score: number,
    duration: number,
  ): Promise<boolean> {
    return this.returnValueForFinish;
  }
}
