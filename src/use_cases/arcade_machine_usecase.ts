import { Context } from "../context";
import {
  ArcadeMachine,
  ArcadePart,
  NftState,
  PlaySessionState,
  Prisma,
} from "@prisma/client";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
  NotFoundUseCaseError,
  PermissionDeniedUseCaseError,
  UnhandledUseCaseError,
} from "./errors";
import { Service } from "typedi";
import { getCapacity } from "../metadata/game-centers";
import { withdrawArcadeMachines } from "../helpers/withdraw";
import { depositArcadeMachine } from "../helpers/deposit";
import { getInstallingFee } from "../helpers/fee";
import {
  notifyAmInstall,
  notifyAmUninstall,
} from "../helpers/event_notification";
import { getArcadeMachineMetadata } from "../metadata/arcade-machines";
import { getUTCTimeAtReferenceRegion } from "../helpers/datetime";
import { shuffle } from "../utils";
import { DISMANTLE_FEES, getAkiverseManagerUserId } from "../constants";
import { GameId, games } from "../metadata/games";
import {
  CabinetCategoryId,
  lowerCabinets,
  upperCabinets,
} from "../metadata/arcade-parts";
import { burnArcadeMachine } from "../helpers/burn";

export type DismantleResponse = {
  rom: ArcadePart;
  upperCabinet: ArcadePart;
  upperCabinetGradeUp: boolean;
  lowerCabinet: ArcadePart;
  lowerCabinetGradeUp: boolean;
};

export type DismantleCurrencyType = "TERAS" | "AKV";
export interface ArcadeMachineUseCase {
  installArcadeMachineToGameCenter(
    ctx: Context,
    arcadeMachineId: string,
    gameCenterId: string,
    autoRenewLease: boolean,
  ): Promise<ArcadeMachine>;

  uninstallArcadeMachineFromGameCenter(
    ctx: Context,
    arcadeMachineId: string,
  ): Promise<ArcadeMachine>;

  withdraw(ctx: Context, ...ids: string[]): Promise<ArcadeMachine[]>;

  deposit(
    ctx: Context,
    hash: string,
    ...ids: string[]
  ): Promise<ArcadeMachine[]>;
  update(
    ctx: Context,
    id: string,
    autoRenewLease: boolean,
  ): Promise<ArcadeMachine>;
  playing(ctx: Context, id: string): Promise<boolean>;
  listPlayableAndRandomize(
    ctx: Context,
    game: string,
    requestCount: number,
    maxPlayingCount: number,
  ): Promise<ArcadeMachine[]>;
  dismantle(
    ctx: Context,
    arcadeMachineId: string,
    currencyType: DismantleCurrencyType,
  ): Promise<DismantleResponse>;
}

@Service("arcadeMachine.useCase")
export default class ArcadeMachineUseCaseImpl implements ArcadeMachineUseCase {
  /**
   * installArcadeMachineToGameCenter.
   *
   * @param ctx
   * @param arcadeMachineId
   * @param gameCenterId
   * @param autoRenewLease
   */
  public async installArcadeMachineToGameCenter(
    ctx: Context,
    arcadeMachineId: string,
    gameCenterId: string,
    autoRenewLease: boolean,
  ): Promise<ArcadeMachine> {
    const arcadeMachine = await ctx.prisma.arcadeMachine.findUnique({
      where: { id: arcadeMachineId },
    });
    if (!arcadeMachine) {
      throw new NotFoundUseCaseError(
        "arcadeMachine is not found",
        "arcade machine",
      );
    }

    if (!ctx.currentUserOwns(arcadeMachine)) {
      throw new PermissionDeniedUseCaseError();
    }

    // 制約によりIN_AKIVERSEじゃないとgameCenterIdを設定できないが、
    // 一応ここで事前確認を行って早めに失敗する
    if (arcadeMachine.state !== "IN_AKIVERSE") {
      throw new IllegalStateUseCaseError("ArcadeMachine not IN_AKIVERSE");
    }

    // GCが紐づいていて、UninstallDateが未来だったらInstall済み
    if (arcadeMachine.gameCenterId) {
      throw new IllegalStateUseCaseError("already installed");
    }

    // 無効なゲームだったらエラーにする
    const metadata = games[arcadeMachine.game as GameId];
    if (!metadata.enabled) {
      throw new InvalidArgumentUseCaseError("invalid game title");
    }

    // Feverが終わっていたら設置できない
    if (arcadeMachine.feverSparkRemain === 0) {
      throw new IllegalStateUseCaseError(
        "ArcadeMachine cannot be installed due to no more Fever remaining",
      );
    }

    const gameCenter = await ctx.prisma.gameCenter.findUnique({
      select: {
        placementAllowed: true,
        size: true,
        state: true,
        arcadeMachines: {
          orderBy: {
            position: "asc",
          },
        },
        userId: true,
      },
      where: { id: gameCenterId },
    });
    if (!gameCenter)
      throw new NotFoundUseCaseError("GameCenter is not found", "game center");

    // 制約によりIN_AKIVERSEじゃないとpacementAllowedはありえないが一応確認
    if (gameCenter.state !== "IN_AKIVERSE") {
      throw new IllegalStateUseCaseError("GameCenter not IN_AKIVERSE");
    }

    if (!gameCenter.placementAllowed) {
      throw new IllegalStateUseCaseError(
        "GameCenter is not recruiting arcadeMachine",
      );
    }
    if (gameCenter.arcadeMachines.length >= getCapacity(gameCenter.size)) {
      throw new IllegalStateUseCaseError("GameCenter is already full");
    }

    // 設置料金が払えるか判定
    // TODO いずれGC毎に設置料金を設定できるようになる見込みのため、もっと前でも判定できるがあえてここで判定している。
    const fee = getInstallingFee();
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
    });
    if (!user) {
      throw new NotFoundUseCaseError("user not found", "User");
    }
    if (
      user.id !== gameCenter.userId &&
      user.terasBalance.comparedTo(fee) < 0
    ) {
      throw new InvalidArgumentUseCaseError("Teras balance is insufficient");
    }

    // すでに紐づけられているAMの中から一番小さい空き番を見つける
    // 昇順にソート済みのAMを小さいほうから見ていき、存在しなかったら空き番
    // 最後まで行ったらリストの一番最後になる位置になる
    let position = 1;
    for (const arcadeMachineElement of gameCenter.arcadeMachines) {
      if (!arcadeMachineElement.position) continue;
      if (arcadeMachineElement.position !== position) {
        break;
      }
      position++;
    }

    try {
      const [updatedArcadeMachine] = await ctx.prisma.$transaction([
        // install arcade machine
        ctx.prisma.arcadeMachine.update({
          where: { id: arcadeMachineId },
          data: {
            position: position,
            gameCenterId: gameCenterId,
            installedAt: new Date(),
            autoRenewLease: autoRenewLease,
          },
        }),
        // GCO Teras balance increment
        ctx.prisma.user.update({
          where: { id: gameCenter.userId! },
          data: {
            terasBalance: {
              increment: fee,
            },
          },
        }),
        // AMO Teras balance decrement
        ctx.prisma.user.update({
          where: { id: ctx.userId },
          data: {
            terasBalance: {
              decrement: fee,
            },
          },
        }),
      ]);
      await notifyAmInstall(
        ctx.userId!,
        gameCenter.userId!,
        arcadeMachineId,
        gameCenterId,
      );
      return updatedArcadeMachine;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          //https://www.prisma.io/docs/reference/api-reference/error-reference#p2002
          throw new ConflictUseCaseError(
            "Specified position is already in use.",
          );
        }
      } else if (e instanceof Prisma.PrismaClientUnknownRequestError) {
        if (e.message.includes("teras_balance_over_zero")) {
          throw new ConflictUseCaseError("Teras balance is insufficient");
        }
      } else if (e instanceof Error) {
        throw new UnhandledUseCaseError("ArcadeMachine update failed", e);
      }
      throw e;
    }
  }

  public async uninstallArcadeMachineFromGameCenter(
    ctx: Context,
    arcadeMachineId: string,
  ): Promise<ArcadeMachine> {
    const arcadeMachine = await ctx.prisma.arcadeMachine.findUnique({
      where: { id: arcadeMachineId },
      include: { gameCenter: true },
    });
    if (!arcadeMachine) {
      throw new NotFoundUseCaseError(
        "ArcadeMachine not found",
        "ArcadeMachine",
      );
    }

    // check ownership
    if (
      !ctx.currentUserOwns(arcadeMachine) &&
      ((arcadeMachine.gameCenter &&
        !ctx.currentUserOwns(arcadeMachine.gameCenter)) ||
        !arcadeMachine.gameCenter)
    ) {
      throw new PermissionDeniedUseCaseError();
    }

    // check state
    if (!arcadeMachine.gameCenterId) {
      throw new IllegalStateUseCaseError("ArcadeMachine is not installed");
    }

    const ret = await ctx.prisma.arcadeMachine.update({
      where: { id: arcadeMachineId },
      data: {
        gameCenterId: null,
        position: null,
        installedAt: null,
      },
    });
    await notifyAmUninstall(
      ctx.userId!,
      arcadeMachine!.gameCenter!.userId!,
      arcadeMachineId,
      arcadeMachine.gameCenterId,
    );
    return ret;
  }

  public async withdraw(
    ctx: Context,
    ...ids: string[]
  ): Promise<ArcadeMachine[]> {
    const arcadeMachines = await ctx.prisma.arcadeMachine.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      include: { user: true },
    });
    if (arcadeMachines.length !== ids.length) {
      throw new NotFoundUseCaseError(
        "ArcadeMachine not found",
        "ArcadeMachine",
      );
    }

    if (!ctx.currentUserOwns(...arcadeMachines)) {
      throw new PermissionDeniedUseCaseError();
    }

    const amGames = [...new Set(arcadeMachines.map((v) => v.game as GameId))];
    const disabledGame = amGames.map((v) => games[v]).find((v) => !v.enabled);
    if (disabledGame) {
      throw new IllegalStateUseCaseError(
        "Invalid game titles cannot be withdrawn",
      );
    }

    await withdrawArcadeMachines(...arcadeMachines);
    return ctx.prisma.arcadeMachine.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  public async deposit(
    ctx: Context,
    hash: string,
    ...ids: string[]
  ): Promise<ArcadeMachine[]> {
    const arcadeMachines = await ctx.prisma.arcadeMachine.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      include: { user: true },
    });
    if (arcadeMachines.length !== ids.length) {
      throw new NotFoundUseCaseError(
        "ArcadeMachine not found",
        "ArcadeMachine",
      );
    }

    if (!ctx.currentUserOwns(...arcadeMachines)) {
      throw new PermissionDeniedUseCaseError();
    }
    const processing = arcadeMachines.map((v) => depositArcadeMachine(v, hash));
    await Promise.all(processing);
    return ctx.prisma.arcadeMachine.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  async update(
    ctx: Context,
    id: string,
    autoRenewLease: boolean,
  ): Promise<ArcadeMachine> {
    const arcadeMachine = await ctx.prisma.arcadeMachine.findUnique({
      where: { id: id },
    });
    if (!arcadeMachine) {
      throw new NotFoundUseCaseError(
        "ArcadeMachine not found",
        "ArcadeMachine",
      );
    }
    if (!ctx.currentUserOwns(arcadeMachine)) {
      throw new PermissionDeniedUseCaseError();
    }
    return await ctx.prisma.arcadeMachine.update({
      where: { id: id, updatedAt: arcadeMachine.updatedAt },
      data: { autoRenewLease: autoRenewLease },
    });
  }
  async playing(ctx: Context, id: string): Promise<boolean> {
    // findUniqueで親となるArcadeMachineを取得することで、Prismaが自動的に同じタイミングで発行されたクエリをまとめてくれる
    // メソッド自体はGraphQLが返却するArcadeMachine毎に何度も呼び出されるが、DB的には一発で取れているのでN+1問題にはならないようになっている
    const playSessions = await ctx.prisma.arcadeMachine.findUnique({
      where: {
        id: id,
      },
      select: {
        playSessions: {
          where: {
            state: {
              not: PlaySessionState.FINISHED,
            },
          },
        },
      },
    });
    return !(playSessions === null || playSessions.playSessions.length === 0);
  }

  async listPlayableAndRandomize(
    ctx: Context,
    game: string,
    requestCount: number,
    maxPlayingCount: number,
  ): Promise<ArcadeMachine[]> {
    // gameが存在するか確認
    try {
      getArcadeMachineMetadata(game);
    } catch (e) {
      throw new InvalidArgumentUseCaseError("Game doesn't exist");
    }

    if (requestCount <= maxPlayingCount) {
      throw new InvalidArgumentUseCaseError(
        "maxPlayingCount is greater than requestCount",
      );
    }

    const userId = ctx.userId;
    // プレイ中は要求より多く返すことはない
    const limitPlayingCount = maxPlayingCount;
    // プレイ中が要求より少ないと全体から不足するので多めに要求
    const limitNotPlayingCount = requestCount;

    const { start, end } = getUTCTimeAtReferenceRegion();
    const akiverseManagerUserId = getAkiverseManagerUserId();

    type IdWithState = {
      // id ArcadeMachineID
      id: string;
      // now_sate ArcadeMachineの現在のstate(READY/PLAYING/FINISHED)
      now_state: PlaySessionState;
    };

    // 現在プレイ中→未プレイの順に要求された件数のAMを取得する
    // クエリとしては
    //   サブクエリ１：現在プレイ中のAMをランダムにmaxPlayingCount分取得(playing_query)
    //   サブクエリ２：現在非プレイ中のAMをランダムにlimitNotPlayingCount分取得(finished_query)
    //   サブクエリ１と２をUNION ALL(main)し、プレイ中を優先してrequestCount分取得
    // することで要求された数分のAMを取得する
    // playing_query/finished_queryを直接UNION ALLできそうだが、LIMITつけた状態でUNION ALLができなかったためにサブクエリになっている。
    const queryRet = await ctx.prisma.$queryRaw<IdWithState[]>`
      SELECT
        id,
        now_state
      FROM (
        SELECT
          id,
          now_state,
          odr
        FROM
        (
          -- プレイ中のAMを最大limitPlayingCount分取得
          SELECT
            am.id AS id,
            'PLAYING' AS now_state, --ユーザー関係なく今のAMの状態。nullの時はPlaySessionが存在しないのでFINISHED(未プレイ状態)
            1 AS odr --ORDER BY用
          FROM
            arcade_machines am
            INNER JOIN game_settings gs ON am.game = gs.game
          WHERE
            am.game = ${game}
            AND am.state = ${NftState.IN_AKIVERSE} :: nft_state
            AND (
              -- 設置済み or 自己保有のAM
              am.game_center_id IS NOT NULL
              OR am.user_id = ${userId} :: uuid
              OR am.user_id = ${akiverseManagerUserId} :: uuid -- CBT2 運営のAMは未設置でプレイ可能
            )
            AND (
              am.fever_spark_remain is null
              OR am.fever_spark_remain > 0
              )
            AND EXISTS(
                    SELECT 'x' FROM play_sessions sub
                               WHERE sub.arcade_machine_id = am.id
                               AND sub.state IN ('PLAYING','READY')
                               AND sub.created_at >= ${start}
                )
            -- daily_max_play_count以上プレイしているAMは除外
            AND NOT EXISTS (
              SELECT
                  'X'
              FROM
                  play_sessions ps
              INNER JOIN plays p on ps.id = p.play_session_id
              WHERE
                  ps.arcade_machine_id = am.id
              AND ps.player_id = ${userId} :: uuid
              AND ps.created_at BETWEEN ${start} AND ${end}
              -- 自身が保有している場合は上限ないので除外する
              AND ps.player_id <> ps.arcade_machine_owner_id
              GROUP BY
                  ps.arcade_machine_id,
                  gs.daily_max_play_count
              HAVING
                  COUNT(p.id) >= gs.daily_max_play_count
            )
          ORDER BY
            (
                case am.user_id
                when ${akiverseManagerUserId} :: uuid then 1
                else 0
                end 
                ),
            random() --postgresql側でランダマイズ
          LIMIT
            ${limitPlayingCount}
        ) as playing_query
        UNION ALL
        SELECT
          id,
          now_state,
          odr
        FROM
        (
          -- 現在プレイされていないAMをlimitNotPlayingCount分取得
          SELECT
            am.id AS id,
             'FINISHED' AS now_state, --未プレイ状態
            2 AS odr --ORDER BY用
          FROM
            arcade_machines am
            INNER JOIN game_settings gs ON am.game = gs.game
          WHERE
            am.game = ${game}
            AND am.state = ${NftState.IN_AKIVERSE} :: nft_state
            AND (
              -- 設置済み or 自己保有のAM
              am.game_center_id IS NOT NULL
              OR am.user_id = ${userId} :: uuid
              OR am.user_id = ${akiverseManagerUserId} :: uuid -- CBT2 運営のAMは未設置でプレイ可能
            )
            AND (
              am.fever_spark_remain is null
              OR am.fever_spark_remain > 0
            )
            AND NOT EXISTS(
                    SELECT 'x' FROM play_sessions sub
                               WHERE sub.arcade_machine_id = am.id
                               AND sub.state IN ('PLAYING','READY')
                               AND sub.created_at >= ${start}
                )
            -- daily_max_play_count以上プレイしているAMは除外
            AND NOT EXISTS (
              SELECT
                  'X'
              FROM
                  play_sessions ps
              INNER JOIN plays p on ps.id = p.play_session_id
              WHERE
                  ps.arcade_machine_id = am.id
                AND ps.player_id = ${userId} :: uuid
                AND ps.created_at BETWEEN ${start} AND ${end}
                -- 自身が保有している場合は上限ないので除外する
                AND ps.player_id <> ps.arcade_machine_owner_id
              GROUP BY
                  ps.arcade_machine_id,
                  gs.daily_max_play_count
              HAVING
                  COUNT(p.id) >= gs.daily_max_play_count
          )
          ORDER BY
              (
                  case am.user_id
                      when ${akiverseManagerUserId} :: uuid then 1
                      else 0
                  end
                  ),
            random() --postgresql側でランダマイズ
          LIMIT
            ${limitNotPlayingCount}
        ) as finished_query
      ) as main
      ORDER BY
        odr --play中→未プレイの順に並べる
      LIMIT
        ${requestCount} -- playing_query+finished_queryはFEから要求された数より多くなるため、再度Limitで行数を制限する
    `;
    if (!queryRet.length) {
      return [];
    }
    let playingCount = 0;

    const ids = Array<string>();
    for (const { id, now_state } of queryRet) {
      if (now_state === PlaySessionState.FINISHED) {
        ids.push(id);
      } else {
        // playing queryでLimitしているので実際はなくても問題ないが念のため
        if (playingCount < maxPlayingCount) {
          playingCount++;
          ids.push(id);
        }
      }
      // Queryの方でLimitしているので実際はなくても問題ないが念のため
      if (ids.length > requestCount) {
        break;
      }
    }
    const AMs = await ctx.prisma.arcadeMachine.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
    return shuffle(AMs);
  }
  async dismantle(
    ctx: Context,
    arcadeMachineId: string,
    currencyType: DismantleCurrencyType,
  ): Promise<DismantleResponse> {
    const arcadeMachine = await ctx.prisma.arcadeMachine.findUnique({
      where: { id: arcadeMachineId },
      include: {
        playSessions: {
          where: {
            state: {
              in: [PlaySessionState.PLAYING, PlaySessionState.READY],
            },
          },
        },
      },
    });
    if (!arcadeMachine) {
      throw new NotFoundUseCaseError(
        "arcadeMachine is not found",
        "arcade machine",
      );
    }

    // ユーザーの保有物であること
    if (!ctx.currentUserOwns(arcadeMachine)) {
      throw new PermissionDeniedUseCaseError();
    }

    // Deposit済みであること
    if (arcadeMachine.state !== "IN_AKIVERSE") {
      throw new IllegalStateUseCaseError("ArcadeMachine not IN_AKIVERSE");
    }

    // プレイされていないこと
    if (arcadeMachine.playSessions.length !== 0) {
      throw new IllegalStateUseCaseError("now playing");
    }

    // MegaSpark状態であること
    if (arcadeMachine.maxEnergy !== arcadeMachine.energy) {
      throw new IllegalStateUseCaseError("no mega spark");
    }

    // 料金チェック
    const user = await ctx.prisma.user.findUnique({
      where: {
        id: ctx.userId,
      },
    });
    if (!user) {
      throw new NotFoundUseCaseError("user not found", "User");
    }

    const { requiredTerasBalance, requiredAkvBalance } =
      currencyType === "TERAS"
        ? {
            requiredTerasBalance: DISMANTLE_FEES.TERAS,
            requiredAkvBalance: new Prisma.Decimal(0),
          }
        : {
            requiredTerasBalance: new Prisma.Decimal(0),
            requiredAkvBalance: DISMANTLE_FEES.AKV,
          };

    if (user.terasBalance.lt(requiredTerasBalance)) {
      throw new IllegalStateUseCaseError("Teras balance is insufficient.");
    }
    if (user.akvBalance.lt(requiredAkvBalance)) {
      throw new IllegalStateUseCaseError("AKV balance is insufficient.");
    }

    // GradeUp判定
    const nextUCInfo =
      upperCabinets[arcadeMachine.upperCabinetSubCategory as CabinetCategoryId]
        .gradeUp;
    const nextLCInfo =
      lowerCabinets[arcadeMachine.lowerCabinetSubCategory as CabinetCategoryId]
        .gradeUp;
    const generateUpperCabinet = this.gradeUp(
      arcadeMachine.upperCabinetSubCategory,
      nextUCInfo,
    );
    const generateLowerCabinet = this.gradeUp(
      arcadeMachine.lowerCabinetSubCategory,
      nextLCInfo,
    );

    let lastUpdatedAt = arcadeMachine.updatedAt;
    if (arcadeMachine.gameCenterId) {
      // GCに設置済みの場合は先に外す
      const uninstalled = await this.uninstallArcadeMachineFromGameCenter(
        ctx,
        arcadeMachineId,
      );
      //最初に取得したupdatedAtから更新されてるので上書きする
      lastUpdatedAt = uninstalled.updatedAt;
    }

    const updated = await ctx.prisma.arcadeMachine.update({
      where: {
        id: arcadeMachineId,
        // 楽観ロックのためWhereの条件に加える
        updatedAt: lastUpdatedAt,
      },
      data: {
        destroyedAt: new Date(),
        user: {
          update: {
            data: {
              terasBalance: {
                decrement: requiredTerasBalance,
              },
              akvBalance: {
                decrement: requiredAkvBalance,
              },
            },
          },
        },
        dismantle: {
          create: {
            user: {
              connect: {
                id: ctx.userId!,
              },
            },
            feverSparkRemain: arcadeMachine.feverSparkRemain!,
            createdArcadeParts: {
              createMany: {
                data: [
                  {
                    category: "ROM",
                    subCategory: arcadeMachine.game,
                    state: "IN_AKIVERSE",
                    userId: ctx.userId!,
                    ownerWalletAddress: ctx.walletAddress,
                  },
                  {
                    category: "UPPER_CABINET",
                    subCategory: generateUpperCabinet.createCabinetGrade,
                    state: "IN_AKIVERSE",
                    userId: ctx.userId!,
                    ownerWalletAddress: ctx.walletAddress,
                  },
                  {
                    category: "LOWER_CABINET",
                    subCategory: generateLowerCabinet.createCabinetGrade,
                    state: "IN_AKIVERSE",
                    userId: ctx.userId!,
                    ownerWalletAddress: ctx.walletAddress,
                  },
                ],
              },
            },
          },
        },
      },
      include: {
        user: true,
        dismantle: {
          include: {
            createdArcadeParts: true,
          },
        },
      },
    });

    await burnArcadeMachine(updated);

    const createdArcadeParts = updated.dismantle!.createdArcadeParts;
    const rom = createdArcadeParts.find((v) => {
      return v.category === "ROM";
    });
    const uc = createdArcadeParts.find((v) => {
      return v.category === "UPPER_CABINET";
    });
    const lc = createdArcadeParts.find((v) => {
      return v.category === "LOWER_CABINET";
    });
    return {
      rom: rom!,
      upperCabinet: uc!,
      upperCabinetGradeUp: generateUpperCabinet.isGradeUp,
      lowerCabinet: lc!,
      lowerCabinetGradeUp: generateLowerCabinet.isGradeUp,
    };
  }

  gradeUp(
    nowCabinetGrade: string,
    gradeUp: { next: CabinetCategoryId; percentage: number },
  ): { createCabinetGrade: string; isGradeUp: boolean } {
    const choice = Math.floor(Math.random() * 100);
    if (choice < gradeUp.percentage) {
      return {
        createCabinetGrade: gradeUp.next,
        isGradeUp: true,
      };
    }
    return {
      createCabinetGrade: nowCabinetGrade,
      isGradeUp: false,
    };
  }
}
