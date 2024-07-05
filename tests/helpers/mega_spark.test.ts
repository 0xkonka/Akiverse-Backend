import { isMegaSparkUpcoming } from "../../src/helpers/mega_spark";

describe("isMegaSparkUpcoming", () => {
  test("isMegaSparkUpcoming - true", () => {
    const result = isMegaSparkUpcoming(9900, 10000);
    expect(result).toBeTruthy();
  });
  test("isMegaSparkUpcoming - false", () => {
    const result = isMegaSparkUpcoming(9899, 10000);
    expect(result).toBeFalsy();
  });
  test("isMegaSparkUpcoming - 既にMAXまで溜まっている", () => {
    const result = isMegaSparkUpcoming(10000, 10000);
    expect(result).toBeFalsy();
  });
});
