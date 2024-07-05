import {
  ArcadeMachineUseCase,
  DismantleResponse,
} from "../../../src/use_cases/arcade_machine_usecase";
import { ArcadeMachine } from "@prisma/client";
import { Context } from "../../../src/context";

export class ArcadeMachineOperationUseCaseMock implements ArcadeMachineUseCase {
  returnValueForInstall: ArcadeMachine | null = null;
  throwErrorForInstall: any | null = null;

  returnValueForUninstall: ArcadeMachine | null = null;
  throwErrorForUninstall: any | null = null;

  returnValueForWithdraw: ArcadeMachine[] | null = null;
  throwErrorForWithdraw: any | null = null;

  returnValueForDeposit: ArcadeMachine[] | null = null;
  throwErrorForDeposit: any | null = null;

  returnValueForUpdate: ArcadeMachine | null = null;
  throwErrorForUpdate: any | null = null;

  returnValueForPlaying: boolean | null = null;
  throwErrorForPlaying: any | null = null;

  returnValueForListRandomArcadeMachines: ArcadeMachine[] | null = null;
  throwErrorForListRandomArcadeMachines: any | null = null;

  returnValueForDismantle: DismantleResponse | null = null;
  throwErrorForDismantle: any | null = null;

  reset() {
    this.returnValueForUninstall = null;
    this.returnValueForInstall = null;
    this.returnValueForWithdraw = null;
    this.returnValueForDeposit = null;
    this.returnValueForUpdate = null;
    this.returnValueForListRandomArcadeMachines = null;
    this.returnValueForDismantle = null;

    this.returnValueForPlaying = null;
    this.throwErrorForUninstall = null;
    this.throwErrorForInstall = null;
    this.throwErrorForWithdraw = null;
    this.throwErrorForDeposit = null;
    this.throwErrorForUpdate = null;
    this.throwErrorForPlaying = null;
    this.throwErrorForListRandomArcadeMachines = null;
    this.throwErrorForDismantle = null;
  }

  async installArcadeMachineToGameCenter(
    ctx: Context,
    arcadeMachineId: string,
    gameCenterId: string,
    autoRenew: boolean,
  ): Promise<ArcadeMachine> {
    if (this.throwErrorForInstall) throw this.throwErrorForInstall;
    if (!this.returnValueForInstall) throw Error("setup error");
    return this.returnValueForInstall;
  }
  async uninstallArcadeMachineFromGameCenter(
    ctx: Context,
    arcadeMachineId: string,
  ): Promise<ArcadeMachine> {
    if (this.throwErrorForUninstall) throw this.throwErrorForUninstall;
    if (!this.returnValueForUninstall) throw Error("setup error");
    return this.returnValueForUninstall;
  }
  async withdraw(ctx: Context, ...ids: string[]): Promise<ArcadeMachine[]> {
    if (this.throwErrorForWithdraw) throw this.throwErrorForWithdraw;
    if (!this.returnValueForWithdraw) throw Error("setup error");
    return this.returnValueForWithdraw;
  }
  async deposit(
    ctx: Context,
    hash: string,
    ...ids: string[]
  ): Promise<ArcadeMachine[]> {
    if (this.throwErrorForDeposit) throw this.throwErrorForDeposit;
    if (!this.returnValueForDeposit) throw Error("setup error");
    return this.returnValueForDeposit;
  }
  async update(
    ctx: Context,
    id: string,
    autoRenewLease: boolean,
  ): Promise<ArcadeMachine> {
    if (this.throwErrorForUpdate) throw this.throwErrorForUpdate;
    if (!this.returnValueForUpdate) throw Error("setup error");
    return this.returnValueForUpdate;
  }

  async playing(ctx: Context, id: string): Promise<boolean> {
    if (this.throwErrorForPlaying) throw this.throwErrorForPlaying;
    if (this.returnValueForPlaying === null) throw Error("setup error");
    return this.returnValueForPlaying;
  }

  async listPlayableAndRandomize(
    ctx: Context,
    game: string,
    requestCount: number,
    maxPlayingCount: number,
  ): Promise<ArcadeMachine[]> {
    if (this.throwErrorForListRandomArcadeMachines)
      throw this.throwErrorForListRandomArcadeMachines;
    if (this.returnValueForListRandomArcadeMachines === null)
      throw Error("setup error");
    return this.returnValueForListRandomArcadeMachines;
  }

  async dismantle(
    ctx: Context,
    arcadeMachineId: string,
  ): Promise<DismantleResponse> {
    if (this.throwErrorForDismantle) throw this.throwErrorForDismantle;
    if (this.returnValueForDismantle === null) throw Error("setup error");
    return this.returnValueForDismantle;
  }
}
