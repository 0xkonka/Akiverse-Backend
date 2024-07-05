import {
  Activity,
  Contest,
  LAST_EXECUTE_NEWER_TOURNAMENT_ID_KEY,
  RoviTournamentManagerUseCaseImpl,
} from "../../src/use_cases/rovi_tournament_manager_usecase";

import { BatchContext } from "../../src/batch_context";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import dayjs, { Dayjs } from "dayjs";
import { eraseDatabase } from "../test_helper";
import { Prisma } from "@prisma/client";

const X_API_KEY = "dummy";
const CONTEST_URL = "http://localhost/contests";
const useCase = new RoviTournamentManagerUseCaseImpl(X_API_KEY, CONTEST_URL);

const ctx = new BatchContext("RoviBatchTest");
describe("tournament info update", () => {
  let httpResponseMockedValues: HttpResponse[];
  const handler = [
    http.get(CONTEST_URL, async ({ request }) => {
      const requestUrl = new URL(request.url);
      const params = requestUrl.searchParams;
      const pageIndexStr = params.get("pageIndex");

      if (!pageIndexStr || Number.isNaN(Number.parseInt(pageIndexStr))) {
        return new HttpResponse("pageIndex invalid", {
          status: 400,
        });
      }
      const pageIndex = Number.parseInt(pageIndexStr);

      const headers = request.headers;

      const xApiKey = headers.get("x-api-key");
      if (!xApiKey || xApiKey !== X_API_KEY) {
        return new HttpResponse("xApiKey invalid", {
          status: 400,
        });
      }

      return httpResponseMockedValues[pageIndex];
    }),
  ];
  const server = setupServer(...handler);

  beforeAll(() => {
    server.listen();
  });
  afterAll(() => {
    server.close();
  });
  beforeEach(async () => {
    await eraseDatabase();
  });
  function createContest(id: number, baseDate: Dayjs): Contest {
    const startTime = baseDate.add(id, "hour");
    const endTime = startTime.add(30, "minute");

    return {
      referenceId: id.toFixed(),
      startTime: startTime.toDate().getTime(),
      endTime: endTime.toDate().getTime(),
      status: "LIVE",
      entryFee: id,
      entryFeeAssetId: 1,
      entryFeeType: "VDA",
      type: "TOURNAMENT",
      rangeType: "RANGE",
      ranges: [
        {
          max: 10,
          min: 1,
          prize: 100 - id,
          chainAssetId: 1,
          prizeType: "VDA",
        },
      ],
      durationInMinutes: 30,
      minPlayers: 4,
      playersLimit: 10000,
      dayScheduleLimit: 20000,
      currentPlayers: 2,
    };
  }
  test("all", async () => {
    // batchControlに空文字設定=全部持ってくる
    await ctx.prisma.batchControl.create({
      data: {
        code: LAST_EXECUTE_NEWER_TOURNAMENT_ID_KEY,
        value: "",
      },
    });

    const headers = new Headers();
    headers.append("Content-Type", "application/json");

    const baseDate = dayjs();
    // offset=0 tournamentId 15-6
    const offset0 = new HttpResponse(
      JSON.stringify({
        contests: [
          createContest(15, baseDate),
          createContest(14, baseDate),
          createContest(13, baseDate),
          createContest(12, baseDate),
          createContest(11, baseDate),
          createContest(10, baseDate),
          createContest(9, baseDate),
          createContest(8, baseDate),
          createContest(7, baseDate),
          createContest(6, baseDate),
        ] as Contest[],
      }),
      {
        status: 200,
        headers: headers,
      },
    );
    // offset=1 tournamentId 6-1
    const offset1 = new HttpResponse(
      JSON.stringify({
        contests: [
          createContest(5, baseDate),
          createContest(4, baseDate),
          createContest(3, baseDate),
          createContest(2, baseDate),
          createContest(1, baseDate),
        ] as Contest[],
      }),
    );

    const offset2 = new HttpResponse(
      JSON.stringify({
        contests: [],
      }),
    );

    httpResponseMockedValues = [offset0, offset1, offset2];
    await useCase.updateTournaments(ctx);

    const afterBatchControl = await ctx.prisma.batchControl.findUniqueOrThrow({
      where: { code: LAST_EXECUTE_NEWER_TOURNAMENT_ID_KEY },
    });
    expect(afterBatchControl.value).toEqual("15");

    const afterRoviTournaments = await ctx.prisma.roviTournament.findMany({
      orderBy: {
        startAt: "desc",
      },
    });
    expect(afterRoviTournaments).toHaveLength(15);
    let currentId = 15;
    for (const afterRoviTournament of afterRoviTournaments) {
      expect(afterRoviTournament.tournamentId).toEqual(currentId.toFixed());
      currentId--;
    }
  });
  test("途中まで存在している状態で実行", async () => {
    await ctx.prisma.batchControl.create({
      data: {
        code: LAST_EXECUTE_NEWER_TOURNAMENT_ID_KEY,
        value: "8",
      },
    });

    const headers = new Headers();
    headers.append("Content-Type", "application/json");

    const baseDate = dayjs();
    // offset=0 tournamentId 15-6
    const offset0 = new HttpResponse(
      JSON.stringify({
        contests: [
          createContest(15, baseDate),
          createContest(14, baseDate),
          createContest(13, baseDate),
          createContest(12, baseDate),
          createContest(11, baseDate),
          createContest(10, baseDate),
          createContest(9, baseDate),
          createContest(8, baseDate),
          createContest(7, baseDate),
          createContest(6, baseDate),
        ] as Contest[],
      }),
      {
        status: 200,
        headers: headers,
      },
    );
    // offset=1 tournamentId 6-1
    const offset1 = new HttpResponse(
      JSON.stringify({
        contests: [
          createContest(5, baseDate),
          createContest(4, baseDate),
          createContest(3, baseDate),
          createContest(2, baseDate),
          createContest(1, baseDate),
        ] as Contest[],
      }),
    );

    const offset2 = new HttpResponse(
      JSON.stringify({
        contests: [],
      }),
    );

    httpResponseMockedValues = [offset0, offset1, offset2];
    await useCase.updateTournaments(ctx);

    const afterBatchControl = await ctx.prisma.batchControl.findUniqueOrThrow({
      where: { code: LAST_EXECUTE_NEWER_TOURNAMENT_ID_KEY },
    });
    expect(afterBatchControl.value).toEqual("15");

    const afterRoviTournaments = await ctx.prisma.roviTournament.findMany({
      orderBy: {
        startAt: "desc",
      },
    });
    expect(afterRoviTournaments).toHaveLength(7);
    let currentId = 15;
    for (const afterRoviTournament of afterRoviTournaments) {
      expect(afterRoviTournament.tournamentId).toEqual(currentId.toFixed());
      currentId--;
    }
  });
});

describe("winner check", () => {
  let tournamentMockedValue: HttpResponse;
  let activitiesMockedValues: HttpResponse[];
  const tournamentInfoUrl = CONTEST_URL + "/tournament1";
  const activitiesUrl = CONTEST_URL + "/tournament1/activities";

  const handler = [
    http.get(tournamentInfoUrl, async ({ request }) => {
      const headers = request.headers;

      const xApiKey = headers.get("x-api-key");
      if (!xApiKey || xApiKey !== X_API_KEY) {
        return new HttpResponse("xApiKey invalid", {
          status: 400,
        });
      }

      return tournamentMockedValue;
    }),
    http.get(activitiesUrl, async ({ request }) => {
      const requestUrl = new URL(request.url);
      const params = requestUrl.searchParams;
      const pageIndexStr = params.get("pageIndex");

      if (!pageIndexStr || Number.isNaN(Number.parseInt(pageIndexStr))) {
        return new HttpResponse("pageIndex invalid", {
          status: 400,
        });
      }
      const pageIndex = Number.parseInt(pageIndexStr);

      const headers = request.headers;

      const xApiKey = headers.get("x-api-key");
      if (!xApiKey || xApiKey !== X_API_KEY) {
        return new HttpResponse("xApiKey invalid", {
          status: 400,
        });
      }

      return activitiesMockedValues[pageIndex];
    }),
  ];
  const server = setupServer(...handler);

  beforeAll(() => {
    server.listen();
  });
  afterAll(() => {
    server.close();
  });
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const now = dayjs();
    await ctx.prisma.roviTournament.create({
      data: {
        tournamentId: "tournament1",
        startAt: now.add(-1, "day").toDate(),
        endAt: now.add(-2, "hour").toDate(),
        winnerChecked: false,
        tournamentType: "TEST",
        minPlayerCount: 4,
        entryFee: 0.1,
        entryFeeAssetId: 1,
        entryFeeType: "VDA",
      },
    });
    tournamentMockedValue = new HttpResponse(
      JSON.stringify({
        referenceId: "tournament1",
        startTime: new Date().getTime(),
        endTime: new Date().getTime(),
        status: "COMPLETED",
        entryFee: 0.2,
        entryFeeAssetId: 1,
        entryFeeType: "VDA",
        type: "TOURNAMENT",
        rangeType: "RANGE",
        ranges: [
          {
            max: 10,
            min: 1,
            prize: 10,
            chainAssetId: 1,
            prizeType: "VDA",
          },
        ],
        durationInMinutes: 30,
        minPlayers: 4,
        playersLimit: 10000,
        dayScheduleLimit: 20000,
        currentPlayers: 2,
      }),
      {
        status: 200,
      },
    );
    activitiesMockedValues = [
      new HttpResponse(
        JSON.stringify({
          contestUserActivities: [
            {
              rank: 5,
              userData: {
                source: "UT",
                sourceId: "1",
                name: "UT1",
              },
              prize: null,
              prizeType: "VDA",
              bestScore: 100,
              assetId: 1,
              playCount: 10,
              totalScore: 10000,
            },
            {
              rank: 1,
              userData: {
                source: "UT",
                sourceId: "2",
                name: "UT2_winner",
              },
              prize: 10.0,
              prizeType: "VDA",
              bestScore: 100,
              assetId: 1,
              playCount: 10,
              totalScore: 10000,
            },
            {
              rank: 3,
              userData: {
                source: "UT",
                sourceId: "3",
                name: "UT3",
              },
              prize: 0,
              prizeType: "VDA",
              bestScore: 100,
              assetId: 1,
              playCount: 10,
              totalScore: 10000,
            },
            {
              rank: 2,
              userData: {
                source: "UT",
                sourceId: "4",
                name: "UT4",
              },
              prize: null,
              prizeType: "VDA",
              bestScore: 100,
              assetId: 1,
              playCount: 10,
              totalScore: 10000,
            },
            {
              rank: 4,
              userData: {
                source: "UT",
                sourceId: "5",
                name: "UT5",
              },
              prize: null,
              prizeType: "VDA",
              bestScore: 100,
              assetId: 1,
              playCount: 10,
              totalScore: 10000,
            },
          ] as Activity[],
        }),
        {
          status: 200,
        },
      ),
      new HttpResponse(
        JSON.stringify({
          contestUserActivities: [] as Activity[],
        }),
        {
          status: 200,
        },
      ),
    ];
    await useCase.exportFinishedTournamentInfo(ctx);
    const afterTournament = await ctx.prisma.roviTournament.findUniqueOrThrow({
      where: {
        tournamentId: "tournament1",
      },
    });
    expect(afterTournament).toMatchObject({
      winnerChecked: true,
      winnerCount: 1,
      playerCount: 5,
      prizeSummary: new Prisma.Decimal(10),
      prizeType: "VDA",
      invalid: false,
    });
  });
  test("トーナメントがLIVE状態のため処理しない", async () => {
    const now = dayjs();
    await ctx.prisma.roviTournament.create({
      data: {
        tournamentId: "tournament1",
        startAt: now.add(-1, "day").toDate(),
        endAt: now.add(-2, "hour").toDate(),
        winnerChecked: false,
        tournamentType: "TEST",
        minPlayerCount: 4,
        entryFee: 0.1,
        entryFeeAssetId: 1,
        entryFeeType: "VDA",
      },
    });
    tournamentMockedValue = new HttpResponse(
      JSON.stringify({
        referenceId: "tournament1",
        startTime: new Date().getTime(),
        endTime: new Date().getTime(),
        status: "LIVE",
        entryFee: 0.2,
        entryFeeAssetId: 1,
        entryFeeType: "VDA",
        type: "TOURNAMENT",
        rangeType: "RANGE",
        ranges: [
          {
            max: 10,
            min: 1,
            prize: 10,
            chainAssetId: 1,
            prizeType: "VDA",
          },
        ],
        durationInMinutes: 30,
        minPlayers: 4,
        playersLimit: 10000,
        dayScheduleLimit: 20000,
        currentPlayers: 2,
      }),
      {
        status: 200,
      },
    );

    await useCase.exportFinishedTournamentInfo(ctx);
    const afterTournament = await ctx.prisma.roviTournament.findUniqueOrThrow({
      where: {
        tournamentId: "tournament1",
      },
    });
    // 更新されていないこと
    expect(afterTournament).toMatchObject({
      winnerChecked: false,
      winnerCount: null,
      playerCount: null,
      prizeSummary: null,
      prizeType: null,
      invalid: false,
    });
  });
  test("参加者0人", async () => {
    const now = dayjs();
    await ctx.prisma.roviTournament.create({
      data: {
        tournamentId: "tournament1",
        startAt: now.add(-1, "day").toDate(),
        endAt: now.add(-2, "hour").toDate(),
        winnerChecked: false,
        tournamentType: "TEST",
        minPlayerCount: 4,
        entryFee: 0.1,
        entryFeeAssetId: 1,
        entryFeeType: "VDA",
      },
    });
    tournamentMockedValue = new HttpResponse(
      JSON.stringify({
        referenceId: "tournament1",
        startTime: new Date().getTime(),
        endTime: new Date().getTime(),
        status: "COMPLETED",
        entryFee: 0.2,
        entryFeeAssetId: 1,
        entryFeeType: "VDA",
        type: "TOURNAMENT",
        rangeType: "RANGE",
        ranges: [
          {
            max: 10,
            min: 1,
            prize: 10,
            chainAssetId: 1,
            prizeType: "VDA",
          },
        ],
        durationInMinutes: 30,
        minPlayers: 4,
        playersLimit: 10000,
        dayScheduleLimit: 20000,
        currentPlayers: 0,
      }),
      {
        status: 200,
      },
    );
    activitiesMockedValues = [
      new HttpResponse(
        JSON.stringify({
          contestUserActivities: [] as Activity[],
        }),
        {
          status: 200,
        },
      ),
    ];
    await useCase.exportFinishedTournamentInfo(ctx);
    const afterTournament = await ctx.prisma.roviTournament.findUniqueOrThrow({
      where: {
        tournamentId: "tournament1",
      },
    });
    expect(afterTournament).toMatchObject({
      winnerChecked: true,
      winnerCount: 0,
      playerCount: 0,
      prizeSummary: new Prisma.Decimal(0),
      prizeType: "",
      invalid: true,
    });
  });
});
