import { getCurrentHour1to24 } from "./datetime";
import {
  FEVER_SPARKED_REWARD_TOTAL,
  INSTALLATION_FEE_OF_DAY,
  SPARKED_TERAS_DISTRIBUTION_RATIO_TO_PLAYER,
} from "../constants";
import { Prisma } from "@prisma/client";
import { GameId, games } from "../metadata/games";
import { InternalServerUseCaseError } from "../use_cases/errors";

export function getInstallingFee(): Prisma.Decimal {
  const floorHour = getCurrentHour1to24();
  return INSTALLATION_FEE_OF_DAY.mul((24 - floorHour) / 24);
}

type CalculatedRewards = {
  emitOwnerReward: Prisma.Decimal;
  emitPlayerReward: Prisma.Decimal;
};

// 獲得Reward計算
export function calculateEmitReward(
  isSelfArcadeMachine: boolean,
  game: string,
  fever: boolean,
): CalculatedRewards {
  const gameInfo = games[game as GameId];
  if (!gameInfo) {
    throw new InternalServerUseCaseError("unknown gameId");
  }
  // 排出Teras量
  const emitRewardSummary = isSelfArcadeMachine
    ? gameInfo.sparkedEmitTerasSelf
    : gameInfo.sparkedEmitTerasOther;

  // fever加算
  const feverRewardSummary = fever
    ? FEVER_SPARKED_REWARD_TOTAL
    : new Prisma.Decimal(0);

  const totalReward = emitRewardSummary.add(feverRewardSummary);

  const emitPlayerReward = totalReward.mul(
    SPARKED_TERAS_DISTRIBUTION_RATIO_TO_PLAYER,
  );
  const emitOwnerReward = totalReward.minus(emitPlayerReward);

  return {
    emitOwnerReward: emitOwnerReward,
    emitPlayerReward: emitPlayerReward,
  };
}
