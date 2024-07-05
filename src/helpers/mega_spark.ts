import { MEGA_SPARK_UPCOMING_COUNT, SPARKED_ENERGY } from "../constants";

// MegaSpark Upcoming状態であることを判定する
export function isMegaSparkUpcoming(
  energy: number,
  maxEnergy: number,
): boolean {
  // 一回のプレイで加算されるEnergy
  const addEnergy = SPARKED_ENERGY;
  // あと何回加算されるとMegaSpark状態にするか
  const manyMoreTimes = MEGA_SPARK_UPCOMING_COUNT;

  // 既にMaxまで溜まっている場合はUpcomingではない
  if (energy === maxEnergy) {
    return false;
  }

  return addEnergy * manyMoreTimes + energy >= maxEnergy;
}
