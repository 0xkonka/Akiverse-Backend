import { Context } from "../../../src/context";
import {
  StartPlaySessionResponse,
  PlayGameUseCase,
} from "../../../src/use_cases/play_game_usecase";
import { PlaySession } from "@prisma/client";

export class PlayGameUseCaseMock implements PlayGameUseCase {
  returnValueForStartPlaySession: StartPlaySessionResponse | null = null;
  throwErrorForStartPlaySession: any | null = null;

  returnValueForFinishPlaySession: PlaySession | null = null;
  throwErrorForFinishPlaySession: any | null = null;

  throwErrorForFinishPlay: any | null = null;
  throwErrorForInProgress: any | null = null;
  throwErrorForStartPlay: any | null = null;

  reset() {
    this.returnValueForStartPlaySession = null;
    this.throwErrorForStartPlaySession = null;

    this.returnValueForFinishPlaySession = null;
    this.throwErrorForFinishPlaySession = null;

    this.throwErrorForFinishPlay = null;
    this.throwErrorForInProgress = null;
    this.throwErrorForStartPlay = null;
  }

  async startPlaySession(
    ctx: Context,
    arcadeMachineId: string,
  ): Promise<StartPlaySessionResponse> {
    if (this.throwErrorForStartPlaySession)
      throw this.throwErrorForStartPlaySession;
    if (!this.returnValueForStartPlaySession) throw Error("setup error");
    return this.returnValueForStartPlaySession;
  }

  async finishPlaySession(
    ctx: Context,
    authToken: string,
  ): Promise<PlaySession> {
    if (this.throwErrorForFinishPlaySession)
      throw this.throwErrorForFinishPlaySession;
    if (!this.returnValueForFinishPlaySession) throw Error("setup error");
    return this.returnValueForFinishPlaySession;
  }

  async finishPlay(
    ctx: Context,
    authToken: string,
    score: number,
  ): Promise<void> {
    if (this.throwErrorForFinishPlay) throw this.throwErrorForFinishPlay;
    return;
  }

  async inProgress(
    ctx: Context,
    authToken: string,
    score?: number,
  ): Promise<void> {
    if (this.throwErrorForInProgress) throw this.throwErrorForInProgress;
    return;
  }

  async startPlay(ctx: Context, authToken: string): Promise<void> {
    if (this.throwErrorForStartPlay) throw this.throwErrorForStartPlay;
    return;
  }
}
