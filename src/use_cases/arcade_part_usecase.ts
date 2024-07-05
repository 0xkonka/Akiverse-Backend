import { Context } from "../context";
import { ArcadePart } from "@prisma/client";
import {
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
  NotFoundUseCaseError,
  PermissionDeniedUseCaseError,
} from "./errors";
import { withdrawArcadeParts } from "../helpers/withdraw";
import { Service } from "typedi";
import { depositArcadePart } from "../helpers/deposit";
import { GameId, games } from "../metadata/games";

export interface ArcadePartUseCase {
  withdraw(ctx: Context, ...ids: string[]): Promise<ArcadePart[]>;

  deposit(ctx: Context, hash: string, ...ids: string[]): Promise<ArcadePart[]>;
}

@Service()
export default class ArcadePartUseCaseImpl implements ArcadePartUseCase {
  async withdraw(ctx: Context, ...ids: string[]): Promise<ArcadePart[]> {
    const arcadeParts = await ctx.prisma.arcadePart.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      include: { user: true },
    });
    if (arcadeParts.length !== ids.length) {
      throw new NotFoundUseCaseError("ArcadePart not found", "ArcadePart");
    }

    // check ownership
    if (!ctx.currentUserOwns(...arcadeParts)) {
      throw new PermissionDeniedUseCaseError();
    }

    const destroyedAp = arcadeParts.find((v) => v.destroyedAt !== null);
    if (destroyedAp) {
      throw new IllegalStateUseCaseError("already destroyed");
    }

    // 無効なROMはWithdraw禁止
    const gameSubCategories = [
      ...new Set(
        arcadeParts
          .filter((v) => v.category === "ROM")
          .map((v) => v.subCategory),
      ),
    ];

    const disabledRom = gameSubCategories
      .map((v) => games[v as GameId])
      .find((v) => !v.enabled);

    if (disabledRom) {
      throw new InvalidArgumentUseCaseError(
        "Invalid game titles cannot be withdrawn",
      );
    }

    await withdrawArcadeParts(...arcadeParts);
    return ctx.prisma.arcadePart.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }
  async deposit(
    ctx: Context,
    hash: string,
    ...ids: string[]
  ): Promise<ArcadePart[]> {
    const arcadeParts = await ctx.prisma.arcadePart.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      include: { user: true },
    });
    if (arcadeParts.length !== ids.length) {
      throw new NotFoundUseCaseError("ArcadePart not found", "ArcadePart");
    }

    // check ownership
    if (!ctx.currentUserOwns(...arcadeParts)) {
      throw new PermissionDeniedUseCaseError();
    }

    const processing = arcadeParts.map((v) => depositArcadePart(v, hash));
    await Promise.all(processing);
    return ctx.prisma.arcadePart.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }
}
