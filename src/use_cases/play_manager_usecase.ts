import prisma from "../prisma";
import { PlayResult, PlaySessionState } from "@prisma/client";
import {
  PLAY_SESSION_READY_TIMEOUT_SECONDS,
  PLAY_TIMEOUT_SECONDS,
} from "../constants";
import { error, info } from "../utils";

export interface PlayManagerUseCase {
  execute(): void;
}

export class PlayManagerUseCaseImpl implements PlayManagerUseCase {
  async execute(): Promise<void> {
    await this.manageForPlays();
    await this.manageForPlaySessions();
  }
  async manageForPlays(): Promise<void> {
    const startDate = new Date();
    info({ msg: "manage for plays:start" });
    info(startDate);

    const targetDate = new Date();
    targetDate.setSeconds(targetDate.getSeconds() - PLAY_TIMEOUT_SECONDS);
    info({ msg: `targetDate:${targetDate}` });

    // PlayをDISCONNECTEDにする
    // PlayがDISCONNECTEDなのにSessionStateがPLAYINGのレコードをFINISHEDに更新する
    // のをトランザクションでやる
    await prisma.$transaction([
      prisma.play.updateMany({
        where: {
          endedAt: null,
          updatedAt: {
            lte: targetDate,
          },
        },
        data: {
          result: PlayResult.DISCONNECTED,
          endedAt: new Date(),
        },
      }),
      prisma.playSession.updateMany({
        where: {
          plays: {
            some: {
              result: PlayResult.DISCONNECTED,
            },
          },
          state: PlaySessionState.PLAYING,
        },
        data: {
          endedAt: new Date(),
          state: PlaySessionState.FINISHED,
        },
      }),
    ]);

    const executeTime = Date.now() - startDate.getTime();
    info({ msg: `manage for plays:end. execute time:${executeTime}` });
  }
  async manageForPlaySessions(): Promise<void> {
    const startDate = new Date();
    info({ msg: "manage for playSession:start" });
    info(startDate);
    try {
      const targetDate = new Date();
      targetDate.setSeconds(
        targetDate.getSeconds() - PLAY_SESSION_READY_TIMEOUT_SECONDS,
      );
      info({ msg: `targetDate:${targetDate}` });

      // READYでタイムアウト時間経過しているレコードをFINISHEDに更新する
      const { count } = await prisma.playSession.updateMany({
        data: {
          endedAt: new Date(),
          state: "FINISHED",
        },
        where: {
          updatedAt: {
            lte: targetDate,
          },
          state: "READY",
        },
      });
      info({ msg: `update count:${count}` });
    } catch (e) {
      error({
        err: JSON.stringify(e, Object.getOwnPropertyNames(e)),
        msg: "play session manager update failed",
      });
    }

    const executeTime = Date.now() - startDate.getTime();
    info({ msg: `manage for playSession:end. execute time:${executeTime}` });
  }
}
