import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { TERM_TIME_ZONE } from "../../src/constants";
import {
  getCombinedCountScore,
  getCombinedRateScore,
  getRegularRankingKeyAndEndDate,
  getSeparatedCountScore,
  getSeparatedRateScore,
  RATE_MAX_COUNT,
} from "../../src/helpers/ranking";
import { InternalServerUseCaseError } from "../../src/use_cases/errors";

dayjs.extend(timezone);
dayjs.extend(utc);
describe("Count Score", () => {
  const endDate = dayjs("2023-12-31 23:59:59").tz(TERM_TIME_ZONE).toDate();
  const afterEndDate = dayjs("2024-1-1 0:0:0").tz(TERM_TIME_ZONE).toDate();
  const firstPlayerDate = dayjs("2023-10-01 0:0:0").tz(TERM_TIME_ZONE).toDate();
  const secondPlayerDate = dayjs("2023-10-01 0:0:1")
    .tz(TERM_TIME_ZONE)
    .toDate();

  test("score 0", () => {
    const combined = getCombinedCountScore(0, firstPlayerDate, endDate);
    const separated = getSeparatedCountScore(combined);
    expect(separated).toEqual(0);
  });
  test("endDate = nowDate", () => {
    const combined = getCombinedCountScore(1, endDate, endDate);
    const separated = getSeparatedCountScore(combined);
    expect(separated).toEqual(1);
  });
  test("score 1", () => {
    const combined = getCombinedCountScore(1, firstPlayerDate, endDate);
    const separated = getSeparatedCountScore(combined);
    expect(separated).toEqual(1);
  });
  test("score 100,000", () => {
    const combined = getCombinedCountScore(100000, firstPlayerDate, endDate);
    const separated = getSeparatedCountScore(combined);
    expect(separated).toEqual(100000);
  });
  test("score 100,000,000", () => {
    const combined = getCombinedCountScore(268435456, firstPlayerDate, endDate);
    const separated = getSeparatedCountScore(combined);
    expect(separated).toEqual(268435456);
  });
  test("For the same score, the combined score is greater if played first", () => {
    const firstPlayer = getCombinedCountScore(100000, firstPlayerDate, endDate);
    const secondPlayer = getCombinedCountScore(
      100000,
      secondPlayerDate,
      endDate,
    );
    expect(firstPlayer).toBeGreaterThan(secondPlayer);
  });
  test("throw error if score is negative", () => {
    expect(() => getCombinedCountScore(-1, firstPlayerDate, endDate)).toThrow(
      InternalServerUseCaseError,
    );
  });
  test("throw error if date later than end date", () => {
    expect(() => getCombinedCountScore(100, afterEndDate, endDate)).toThrow(
      InternalServerUseCaseError,
    );
  });
});

describe("Rate Score", () => {
  const endDate = dayjs("2023-11-21 16:00").tz(TERM_TIME_ZONE).toDate();
  const afterEndDate = dayjs("2024-1-1 0:0:0").tz(TERM_TIME_ZONE).toDate();
  const firstPlayerDate = dayjs("2023-11-10 12:30:25")
    .tz(TERM_TIME_ZONE)
    .toDate();
  const secondPlayerDate = dayjs("2023-11-10 12:30:26")
    .tz(TERM_TIME_ZONE)
    .toDate();
  test("rate 0.0", () => {
    const combined = getCombinedRateScore(0.0, 0, firstPlayerDate, endDate);
    const separated = getSeparatedRateScore(combined);
    expect(separated).toEqual(0.0);
  });
  test("rate 100.00", () => {
    const combined = getCombinedRateScore(100.0, 0, firstPlayerDate, endDate);
    const separated = getSeparatedRateScore(combined);
    expect(separated).toEqual(100.0);
  });
  test("rate 12.345", () => {
    const combined = getCombinedRateScore(
      12.345,
      16383,
      firstPlayerDate,
      endDate,
    );
    const separated = getSeparatedRateScore(combined);
    expect(separated).toEqual(12.34);
  });
  test("For the same rate, the user with the highest number of plays will be ranked higher.", () => {
    const first = getCombinedRateScore(12.345, 100, firstPlayerDate, endDate);
    const second = getCombinedRateScore(12.34, 200, secondPlayerDate, endDate);
    expect(second).toBeGreaterThan(first);
  });
  test("In case of the same rate and number of plays, the player who registered his/her score first will be ranked higher.", () => {
    const first = getCombinedRateScore(12.345, 100, firstPlayerDate, endDate);
    const second = getCombinedRateScore(12.345, 100, secondPlayerDate, endDate);
    expect(second).toBeLessThan(first);
  });
  test("count overflow", () => {
    expect(() =>
      getCombinedRateScore(
        12.345,
        RATE_MAX_COUNT + 1,
        firstPlayerDate,
        endDate,
      ),
    ).toThrow(InternalServerUseCaseError);
  });
  test("throw error if rate is negative", () => {
    expect(() =>
      getCombinedRateScore(-1.23, 1, firstPlayerDate, endDate),
    ).toThrow(InternalServerUseCaseError);
  });
  test("throw error if count is negative", () => {
    expect(() =>
      getCombinedRateScore(1.23, -1, firstPlayerDate, endDate),
    ).toThrow(InternalServerUseCaseError);
  });
  test("throw error if date later than end date", () => {
    expect(() => getCombinedRateScore(1.23, 1, afterEndDate, endDate)).toThrow(
      InternalServerUseCaseError,
    );
  });
});

describe("get regular ranking key", () => {
  test("spark/2023-11-15 23:59:59", () => {
    const date = dayjs("2023-11-15", TERM_TIME_ZONE)
      .tz(TERM_TIME_ZONE)
      .endOf("date")
      .toDate();
    expect(getRegularRankingKeyAndEndDate("SPARK", true, date)).toEqual({
      key: "regular_spark_202311_early",
      endDate: dayjs("2023-11-15", TERM_TIME_ZONE)
        .tz(TERM_TIME_ZONE)
        .endOf("date")
        .toDate(),
    });
    expect(getRegularRankingKeyAndEndDate("SPARK", false, date)).toEqual({
      key: "regular_spark_202310_late",
      endDate: dayjs("2023-10-1", TERM_TIME_ZONE)
        .tz(TERM_TIME_ZONE)
        .endOf("month")
        .toDate(),
    });
  });
  test("mega spark/2023-11-16 0:0:0", () => {
    const date = dayjs("2023-11-16", TERM_TIME_ZONE)
      .tz(TERM_TIME_ZONE)
      .startOf("date")
      .toDate();
    expect(getRegularRankingKeyAndEndDate("MEGA_SPARK", true, date)).toEqual({
      key: "regular_mega_spark_202311_late",
      endDate: dayjs("2023-11-30", TERM_TIME_ZONE)
        .tz(TERM_TIME_ZONE)
        .endOf("month")
        .toDate(),
    });
    expect(getRegularRankingKeyAndEndDate("MEGA_SPARK", false, date)).toEqual({
      key: "regular_mega_spark_202311_early",
      endDate: dayjs("2023-11-15", TERM_TIME_ZONE)
        .tz(TERM_TIME_ZONE)
        .endOf("date")
        .toDate(),
    });
  });
  test("年跨ぎ", () => {
    const date = dayjs("2024-1-1 0:0:0", TERM_TIME_ZONE)
      .tz(TERM_TIME_ZONE)
      .toDate();
    expect(getRegularRankingKeyAndEndDate("SPARK", false, date)).toEqual({
      key: "regular_spark_202312_late",
      endDate: dayjs("2023-12-1", TERM_TIME_ZONE)
        .tz(TERM_TIME_ZONE)
        .endOf("month")
        .toDate(),
    });
  });
});
