import {
  getCurrentHour1to24,
  getUTCTimeAtReferenceRegion,
  loginYYYYMMDD,
} from "../../src/helpers/datetime";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { TERM_TIME_ZONE } from "../../src/constants";

dayjs.extend(timezone);
dayjs.extend(utc);

// 2022/12/1 10:00:00 JST
const mockDate = new Date("2022-12-01T10:00:00+0900");
const locale = "ja-JP";

describe("getUTCTimeAtReferenceRegion", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });
  // beforeEach(() => {
  //
  // });
  afterAll(() => {
    jest.useRealTimers();
  });
  test("check", () => {
    const ret = getUTCTimeAtReferenceRegion();
    // 開始日時
    // JSTで当日の0時
    expect(ret.start.toLocaleString(locale, { timeZone: "Asia/Tokyo" })).toBe(
      "2022/12/1 0:00:00",
    );
    // UTCだと-9するので前日の15時
    expect(ret.start.toLocaleString(locale, { timeZone: "UTC" })).toBe(
      "2022/11/30 15:00:00",
    );

    // 終了日時
    // JSTで翌日の0時
    expect(ret.end.toLocaleString(locale, { timeZone: "Asia/Tokyo" })).toBe(
      "2022/12/2 0:00:00",
    );
    // UTCだと-9するので当日の15時
    expect(ret.end.toLocaleString(locale, { timeZone: "UTC" })).toBe(
      "2022/12/1 15:00:00",
    );
  });
});
describe("getCurrentHour1to24", () => {
  afterEach(() => {
    jest.useRealTimers();
  });
  test("0:00 to 24", () => {
    const mockDate = new Date("2022-12-01T00:00:00+0900");
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    const ret = getCurrentHour1to24();
    expect(ret).toEqual(24);
  });
  test("0:01 to 24", () => {
    const mockDate = new Date("2022-12-01T00:01:00+0900");
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    const ret = getCurrentHour1to24();
    expect(ret).toEqual(24);
  });
  test("1:01 to 1", () => {
    const mockDate = new Date("2022-12-01T01:01:00+0900");
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    const ret = getCurrentHour1to24();
    expect(ret).toEqual(1);
  });
  test("23:01 to 23", () => {
    const mockDate = new Date("2022-12-01T23:01:00+0900");
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    const ret = getCurrentHour1to24();
    expect(ret).toEqual(23);
  });
  test("23:59 to 23", () => {
    const mockDate = new Date("2022-12-01T23:59:59+0900");
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    const ret = getCurrentHour1to24();
    expect(ret).toEqual(23);
  });
});
describe("loginYYYYMMDD", () => {
  test("JST 0:00", () => {
    const date0000 = dayjs
      .tz("2023-09-13 0:0:0", "YYYY-MM-DD HH:mm:ss", TERM_TIME_ZONE)
      .toDate();
    expect(loginYYYYMMDD(date0000)).toEqual("20230913");
  });
  test("JST 15:59", () => {
    const date0559 = dayjs
      .tz("2023-09-13 15:59:59", "YYYY-MM-DD HH:mm:ss", TERM_TIME_ZONE)
      .toDate();
    expect(loginYYYYMMDD(date0559)).toEqual("20230913");
  });
  test("JST 16:00", () => {
    const date1600 = dayjs
      .tz("2023-09-13 16:00:00", "YYYY-MM-DD HH:mm:ss", TERM_TIME_ZONE)
      .toDate();
    expect(loginYYYYMMDD(date1600)).toEqual("20230914");
  });
  test("JST 23:59", () => {
    const date2359 = dayjs
      .tz("2023-09-13 23:59:59", "YYYY-MM-DD HH:mm:ss", TERM_TIME_ZONE)
      .toDate();
    expect(loginYYYYMMDD(date2359)).toEqual("20230914");
  });
});
