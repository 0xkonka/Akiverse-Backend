import { calculateEmitReward } from "../../src/helpers/fee";
import {
  FEVER_SPARKED_REWARD_TOTAL,
  SPARKED_TERAS_DISTRIBUTION_RATIO_TO_PLAYER,
} from "../../src/constants";
import { games } from "../../src/metadata/games";

describe("calculate emit Reward", () => {
  test("calculate - 自保有のAM", () => {
    const calculated = calculateEmitReward(true, "BUBBLE_ATTACK", false);
    const bubble = games["BUBBLE_ATTACK"];
    const result = bubble.sparkedEmitTerasSelf.mul(
      SPARKED_TERAS_DISTRIBUTION_RATIO_TO_PLAYER,
    );
    expect(calculated.emitPlayerReward).toEqual(result);
    expect(calculated.emitOwnerReward).toEqual(result);
  });
  test("calculate - 他保有のAM", () => {
    const calculated = calculateEmitReward(false, "BUBBLE_ATTACK", false);
    const bubble = games["BUBBLE_ATTACK"];
    const result = bubble.sparkedEmitTerasOther.mul(
      SPARKED_TERAS_DISTRIBUTION_RATIO_TO_PLAYER,
    );
    expect(calculated.emitPlayerReward).toEqual(result);
    expect(calculated.emitOwnerReward).toEqual(result);
  });
  test("calculate - 自己保有のAMでFever中", () => {
    const calculated = calculateEmitReward(true, "BUBBLE_ATTACK", true);
    const bubble = games["BUBBLE_ATTACK"];
    const totalReward = bubble.sparkedEmitTerasSelf.add(
      FEVER_SPARKED_REWARD_TOTAL,
    );
    const result = totalReward.mul(SPARKED_TERAS_DISTRIBUTION_RATIO_TO_PLAYER);
    expect(calculated.emitPlayerReward).toEqual(result);
    expect(calculated.emitOwnerReward).toEqual(result);
  });
  test("calculate - 他保有のAMでFever中", () => {
    const calculated = calculateEmitReward(false, "BUBBLE_ATTACK", true);
    const bubble = games["BUBBLE_ATTACK"];
    const totalReward = bubble.sparkedEmitTerasSelf.add(
      FEVER_SPARKED_REWARD_TOTAL,
    );
    const result = totalReward.mul(SPARKED_TERAS_DISTRIBUTION_RATIO_TO_PLAYER);
    expect(calculated.emitPlayerReward).toEqual(result);
    expect(calculated.emitOwnerReward).toEqual(result);
  });
});
