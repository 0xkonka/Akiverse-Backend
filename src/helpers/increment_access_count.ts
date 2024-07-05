import { Context } from "../context";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { TERM_TIME_ZONE } from "../constants";

dayjs.extend(timezone);
dayjs.extend(utc);
export async function incrementAccessCount(ctx: Context): Promise<void> {
  const userId = ctx.userId;
  if (!userId) {
    return;
  }
  try {
    const date = dayjs().tz(TERM_TIME_ZONE).format("YYYYMMDD");
    await ctx.prisma.accessLog.upsert({
      create: {
        date: date,
        userId: userId,
      },
      update: {
        accessCount: {
          increment: 1,
        },
      },
      where: {
        date_userId: {
          date: date,
          userId: userId,
        },
      },
    });
  } catch (e) {
    // アクセスログの保存だけなのでログだけ流して正常終了する
    ctx.log.warn("access log upsert failed", e);
  }
}
