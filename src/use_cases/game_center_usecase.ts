import { Context } from "../context";
import { ArcadeMachine, GameCenter } from "@prisma/client";
import {
  IllegalStateUseCaseError,
  NotFoundUseCaseError,
  PermissionDeniedUseCaseError,
} from "./errors";
import { Service } from "typedi";
import { withdrawGameCenters } from "../helpers/withdraw";
import { depositGameCenter } from "../helpers/deposit";
import {
  notifyStartRentOut,
  notifyStopRentingReserve,
} from "../helpers/event_notification";

export interface GameCenterUseCase {
  startRecruitmentForArcadeMachine(
    ctx: Context,
    id: string,
  ): Promise<GameCenter>;

  stopRecruitmentForArcadeMachine(
    ctx: Context,
    id: string,
  ): Promise<GameCenter>;

  listPlacementArcadeMachines(
    ctx: Context,
    id: string,
  ): Promise<GameCenterWithArcadeMachines>;

  withdraw(ctx: Context, ...ids: string[]): Promise<GameCenter[]>;

  deposit(ctx: Context, hash: string, ...ids: string[]): Promise<GameCenter[]>;
}

export type GameCenterWithArcadeMachines = GameCenter & {
  arcadeMachines: ArcadeMachine[];
};

@Service()
export class GameCenterUseCaseImpl implements GameCenterUseCase {
  async startRecruitmentForArcadeMachine(
    ctx: Context,
    id: string,
  ): Promise<GameCenter> {
    const gameCenter = await ctx.prisma.gameCenter.findFirst({
      where: { id: id },
      select: { placementAllowed: true, state: true, userId: true },
    });
    if (!gameCenter) {
      throw new NotFoundUseCaseError("GameCenter not found", "GameCenter");
    }
    if (!ctx.currentUserOwns(gameCenter)) {
      throw new PermissionDeniedUseCaseError();
    }

    // 制約によりIN_AKIVERSEじゃないとplacementAllowedをtrueにできないが、
    // 一応ここで事前確認を行って早めに失敗する
    if (gameCenter.state !== "IN_AKIVERSE") {
      throw new IllegalStateUseCaseError("not IN_AKIVERSE");
    }

    if (gameCenter.placementAllowed) {
      throw new IllegalStateUseCaseError("already recruiting");
    }

    const ret = await ctx.prisma.gameCenter.update({
      where: { id: id },
      data: { placementAllowed: true },
    });
    await notifyStartRentOut(ctx.userId!, id);
    return ret;
  }

  async stopRecruitmentForArcadeMachine(
    ctx: Context,
    id: string,
  ): Promise<GameCenter> {
    const gameCenter = await ctx.prisma.gameCenter.findFirst({
      where: { id: id },
      select: { placementAllowed: true, userId: true },
    });
    if (!gameCenter) {
      throw new NotFoundUseCaseError("GameCenter not found", "GameCenter");
    }
    if (!ctx.currentUserOwns(gameCenter)) {
      throw new PermissionDeniedUseCaseError();
    }
    if (!gameCenter.placementAllowed) {
      throw new IllegalStateUseCaseError("already stopped recruiting");
    }

    const ret = await ctx.prisma.gameCenter.update({
      where: { id: id },
      data: {
        placementAllowed: false,
      },
    });
    await notifyStopRentingReserve(ctx.userId!, id);
    return ret;
  }

  async listPlacementArcadeMachines(
    ctx: Context,
    id: string,
  ): Promise<GameCenterWithArcadeMachines> {
    return await ctx.prisma.gameCenter.findFirstOrThrow({
      where: { id },
      include: { arcadeMachines: true },
    });
  }

  async withdraw(ctx: Context, ...ids: string[]): Promise<GameCenter[]> {
    const gameCenters = await ctx.prisma.gameCenter.findMany({
      where: { id: { in: ids } },
      include: { user: true },
    });
    if (gameCenters.length !== ids.length) {
      throw new NotFoundUseCaseError("GameCenter not found", "GameCenter");
    }

    // check ownership
    if (!ctx.currentUserOwns(...gameCenters)) {
      throw new PermissionDeniedUseCaseError();
    }
    await withdrawGameCenters(...gameCenters);
    return ctx.prisma.gameCenter.findMany({
      where: { id: { in: ids } },
    });
  }

  async deposit(
    ctx: Context,
    hash: string,
    ...ids: string[]
  ): Promise<GameCenter[]> {
    const gameCenters = await ctx.prisma.gameCenter.findMany({
      where: { id: { in: ids } },
      include: { user: true },
    });
    if (gameCenters.length !== ids.length) {
      throw new NotFoundUseCaseError("GameCenter not found", "GameCenter");
    }

    // check ownership
    if (!ctx.currentUserOwns(...gameCenters)) {
      throw new PermissionDeniedUseCaseError();
    }
    const processing = gameCenters.map((v) => depositGameCenter(v, hash));
    await Promise.all(processing);
    return ctx.prisma.gameCenter.findMany({
      where: { id: { in: ids } },
    });
  }
}
