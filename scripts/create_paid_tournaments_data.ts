import { PaidTournamentType } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { v4 as uuid } from "uuid";
import * as fs from "node:fs";

dayjs.extend(utc);
dayjs.extend(timezone);

const tournamentInsertPrefix = `INSERT INTO "paid_tournaments" ("id", "title", "start_at", "end_at", "paid_tournament_type","entry_fee_tickets")
VALUES `;

const relationInsertPrefix = `INSERT INTO "paid_tournament_booster_availables" ( "paid_tournament_id", "booster_master_id")
VALUES `;

async function main() {
  const [startDateString, endDateString] = process.argv.slice(2);

  if (!startDateString || !endDateString) {
    console.error(
      "開始日と終了日を指定してください。例: yarn create_paid_tournaments_data 2024-07-01 2024-07-07",
    );
    process.exit(1);
  }

  const startDate = dayjs(startDateString);
  const endDate = dayjs(endDateString);

  // 4時間トーナメント用アイテム
  const boosterMasterIds = [
    "SPARK_TERAS_UP_X2_10M",
    "SPARK_TERAS_UP_X2_30M",
    "SPARK_TERAS_UP_X2_60M",
    "SPARK_TERAS_UP_X5_10M",
    "SPARK_TERAS_UP_X5_30M",
    "EASY_MODE_ALL_10M",
    "EASY_MODE_ALL_30M",
  ];

  // 15分トーナメント用アイテム
  const boosterMasterIdsFor15min = [
    "SPARK_TERAS_UP_X2_10M",
    "SPARK_TERAS_UP_X5_10M",
    "EASY_MODE_ALL_10M",
  ];

  const title = "All Games SPARK";

  const tournamentQueries = [];
  const boosterRelationQueries = [];
  for (
    let date = startDate;
    date.isBefore(endDate) || date.isSame(endDate);
    date = date.add(1, "day")
  ) {
    // 15分トーナメントのスケジュール
    for (let hour = 0; hour < 24; hour++) {
      if (hour >= 11 && hour < 14) continue; // 11時〜14時は3時間トーナメント
      if (hour >= 14 && hour < 18) continue; // 14時〜18時は4時間トーナメント
      if (hour >= 18 && hour < 22) continue; // 18時〜22時は4時間トーナメント

      for (let minute = 0; minute < 60; minute += 15) {
        const startAt = date.hour(hour).minute(minute);
        const endAt = startAt.add(15, "minute");

        const startAtUtc = startAt.tz("Asia/Tokyo").utc();
        const endAtUtc = endAt.tz("Asia/Tokyo").utc();

        const tournamentData = {
          id: uuid(),
          title: title,
          start_at: startAtUtc.toDate(),
          end_at: endAtUtc.toDate(),
          paid_tournament_type: PaidTournamentType.SPARK_COUNT,
          entry_fee: 20,
        };

        const tournamentInsert = `('${tournamentData.id}', '${tournamentData.title}', '${startAtUtc.format("YYYY-MM-DD HH:mm:ss")}', '${endAtUtc.format("YYYY-MM-DD HH:mm:ss")}', '${tournamentData.paid_tournament_type}', ${tournamentData.entry_fee})`;
        tournamentQueries.push(tournamentInsert);

        for (const boosterMasterId of boosterMasterIdsFor15min) {
          const relationInsert = `( '${tournamentData.id}', '${boosterMasterId}')`;
          boosterRelationQueries.push(relationInsert);
        }
      }
    }

    // 3/4時間トーナメントのスケジュール
    const tournamentSchedules = [
      { startHour: 11, endHour: 14 },
      { startHour: 14, endHour: 18 },
      { startHour: 18, endHour: 22 },
    ];

    for (const schedule of tournamentSchedules) {
      const startAt = date.hour(schedule.startHour);
      const endAt = date.hour(schedule.endHour);

      const startAtUtc = startAt.tz("Asia/Tokyo").utc();
      const endAtUtc = endAt.tz("Asia/Tokyo").utc();

      const tournamentData = {
        id: uuid(),
        title: title,
        start_at: startAtUtc.toDate(),
        end_at: endAtUtc.toDate(),
        paid_tournament_type: PaidTournamentType.SPARK_COUNT,
        entry_fee: 20,
      };

      const tournamentInsert = `('${tournamentData.id}', '${tournamentData.title}', '${startAtUtc.format("YYYY-MM-DD HH:mm:ss")}', '${endAtUtc.format("YYYY-MM-DD HH:mm:ss")}', '${tournamentData.paid_tournament_type}', ${tournamentData.entry_fee})`;
      tournamentQueries.push(tournamentInsert);

      for (const boosterMasterId of boosterMasterIds) {
        const relationInsert = `( '${tournamentData.id}', '${boosterMasterId}')`;
        boosterRelationQueries.push(relationInsert);
      }
    }
  }

  const tournamentInsertSql =
    tournamentInsertPrefix + tournamentQueries.join(",\n") + ";";
  const relationInsertSql =
    relationInsertPrefix + boosterRelationQueries.join(",\n") + ";";

  fs.writeFileSync(
    `tournament_query_${startDate.toISOString()}.sql`,
    [tournamentInsertSql, relationInsertSql].join("\n"),
  );
}

main();
