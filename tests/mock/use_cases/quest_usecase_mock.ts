import {
  FinishQuestChainResponse,
  QuestUseCase,
} from "../../../src/use_cases/quest_usecase";
import { Context } from "vm";
import { undefined } from "zod";
import { QuestChain } from "@prisma/client";

export class QuestUseCaseMock implements QuestUseCase {
  returnValueForStartQuestChain: QuestChain | null = null;
  throwErrorForStartQuestChain: any = null;
  returnValueForFinishQuestChain: FinishQuestChainResponse | null = null;
  throwErrorForFinishQuestChain: any = null;
  returnValueForProgress: number = 0;

  reset() {
    this.returnValueForProgress = 0;
    this.returnValueForStartQuestChain = null;
    this.returnValueForFinishQuestChain = null;
    this.throwErrorForFinishQuestChain = null;
    this.throwErrorForStartQuestChain = null;
  }
  finishQuestChain(
    ctx: Context,
    questChainMasterId: string,
  ): Promise<FinishQuestChainResponse> {
    if (this.throwErrorForFinishQuestChain)
      throw this.throwErrorForFinishQuestChain;
    if (!this.returnValueForFinishQuestChain) throw Error("setup failed");
    return Promise.resolve(this.returnValueForFinishQuestChain);
  }

  progress(
    ctx: Context,
    questMasterId: string,
    completedAt: Date | null | undefined,
    startAt: Date,
  ): Promise<number> {
    return Promise.resolve(this.returnValueForProgress);
  }

  startQuestChain(
    ctx: Context,
    questChainMasterId: string,
  ): Promise<QuestChain> {
    if (this.throwErrorForStartQuestChain)
      throw this.throwErrorForStartQuestChain;
    if (!this.returnValueForStartQuestChain) throw Error("setup failed");
    return Promise.resolve(this.returnValueForStartQuestChain);
  }
}
