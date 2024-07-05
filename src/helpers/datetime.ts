import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { TERM_TIME_ZONE } from "../constants";

dayjs.extend(timezone);
dayjs.extend(utc);

export type UTCTimeAtReferenceRegion = {
  start: Date;
  end: Date;
};

/*
 * 日本の0時と24時を表すUTC Dateオブジェクトを返す.
 * */
export function getUTCTimeAtReferenceRegion(): UTCTimeAtReferenceRegion {
  // TimezoneがTokyoの現在時刻を持つ
  const tokyoNow = dayjs().tz(TERM_TIME_ZONE);

  // 日本時間で時刻からミリ秒までを0にセットすることで、
  // 日本時間0時を作る
  const start = tokyoNow
    .set("hour", 0)
    .set("minute", 0)
    .set("second", 0)
    .set("millisecond", 0);

  // 日本時間0時に日を1日加算することで24時を作る
  const end = start.add(1, "day");

  return {
    start: start.toDate(),
    end: end.toDate(),
  };
}

/**
 * getCurrentHour1to24
 * 現在時刻の時間を返す。0時は24時として返す。
 */
export function getCurrentHour1to24(): number {
  const tokyoNow = dayjs().tz(TERM_TIME_ZONE);
  const floorHour = tokyoNow.get("hour");
  if (floorHour <= 0) {
    return 24;
  }
  return floorHour;
}

// 現在時刻から addDays の分の日付を加算したDateを返す
export function nowAddDays(addDays: number): Date {
  const now = dayjs().tz(TERM_TIME_ZONE);
  const added = now.add(addDays, "day");
  return added.toDate();
}

// dateからログインしたと計上される日を取得する
// JST 16:00を境に日付を管理する
export function loginYYYYMMDD(date: Date): string {
  return loginDate(date).format("YYYYMMDD");
}

// dateからログインしたと計上される日を取得する
// JST 16:00を境に日付を管理する
// dayjs.Dayjs形式で返却する
export function loginDate(date: Date): dayjs.Dayjs {
  const day = dayjs(date).tz(TERM_TIME_ZONE);
  if (day.hour() >= 16) {
    // 16時以降は翌日の扱い
    return day.add(1, "day");
  }
  return day;
}

export function getSecondsDifference(date1: Date, date2: Date): number {
  // 2つの日付オブジェクトをミリ秒単位で取得
  const time1 = date1.getTime();
  const time2 = date2.getTime();

  // ミリ秒単位の差を計算
  const timeDiff = time2 - time1;

  // ミリ秒を秒に変換して返す
  const secondsDiff = Math.floor(timeDiff / 1000);

  return secondsDiff;
}
