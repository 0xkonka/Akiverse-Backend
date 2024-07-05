import {
  GameCenterUseCase,
  GameCenterWithArcadeMachines,
} from "../../../src/use_cases/game_center_usecase";
import { Context } from "../../../src/context";
import { GameCenter } from "@prisma/client";

export class GameCenterUseCaseMock implements GameCenterUseCase {
  returnValueForStart: GameCenter | null = null;
  throwErrorForStart: any | null = null;

  returnValueForStop: GameCenter | null = null;
  throwErrorForStop: any | null = null;

  returnValueForList: GameCenterWithArcadeMachines | null = null;
  throwErrorForList: any | null = null;

  returnValueForWithdraw: GameCenter[] | null = null;
  throwErrorForWithdraw: any | null = null;

  returnValueForDeposit: GameCenter[] | null = null;
  throwErrorForDeposit: any | null = null;

  reset() {
    this.returnValueForStart = null;
    this.returnValueForStop = null;
    this.returnValueForList = null;
    this.returnValueForDeposit = null;

    this.throwErrorForStart = null;
    this.throwErrorForStop = null;
    this.throwErrorForList = null;
    this.throwErrorForDeposit = null;
  }
  async startRecruitmentForArcadeMachine(
    ctx: Context,
    id: string,
  ): Promise<GameCenter> {
    if (this.throwErrorForStart) throw this.throwErrorForStart;
    if (!this.returnValueForStart) throw new Error("setup error");
    return this.returnValueForStart;
  }

  async stopRecruitmentForArcadeMachine(
    ctx: Context,
    id: string,
  ): Promise<GameCenter> {
    if (this.throwErrorForStop) throw this.throwErrorForStop;
    if (!this.returnValueForStop) throw new Error("setup error");
    return this.returnValueForStop;
  }

  async listPlacementArcadeMachines(
    ctx: Context,
    id: string,
  ): Promise<GameCenterWithArcadeMachines> {
    if (this.throwErrorForList) throw this.throwErrorForList;
    if (!this.returnValueForList) throw new Error("setup error");
    return this.returnValueForList;
  }
  async withdraw(ctx: Context, ...ids: string[]): Promise<GameCenter[]> {
    if (this.throwErrorForWithdraw) throw this.throwErrorForWithdraw;
    if (!this.returnValueForWithdraw) throw new Error("setup error");
    return this.returnValueForWithdraw;
  }

  async deposit(
    ctx: Context,
    hash: string,
    ...ids: string[]
  ): Promise<GameCenter[]> {
    if (this.throwErrorForDeposit) throw this.throwErrorForDeposit;
    if (!this.returnValueForDeposit) throw new Error("setup error");
    return this.returnValueForDeposit;
  }
}
