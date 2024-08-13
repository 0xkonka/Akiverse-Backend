import { isMegaSparkUpcoming } from "../../src/helpers/mega_spark";
import { SPARKED_ENERGY } from "../../src/constants";

describe("isMegaSparkUpcoming", () => {
  test("isMegaSparkUpcoming - true", () => {
    const result = isMegaSparkUpcoming(10000 - SPARKED_ENERGY, 10000);
    expect(result).toBeTruthy();
  });
  test("isMegaSparkUpcoming - false", () => {
    const result = isMegaSparkUpcoming(10000 - SPARKED_ENERGY - 1, 10000);
    expect(result).toBeFalsy();
  });
  test("isMegaSparkUpcoming - 既にMAXまで溜まっている", () => {
    const result = isMegaSparkUpcoming(10000, 10000);
    expect(result).toBeFalsy();
  });
});
