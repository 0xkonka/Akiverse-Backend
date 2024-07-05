import { Context } from "../context";
import { v4 as uuid } from "uuid";
import { Service } from "typedi";
import { ROVI_WEBHOOK_URL_BASE } from "../constants";
import {
  generateRoviGamePlayToken,
  verifyRoviGamePlayToken,
} from "../helpers/token";

export interface RoviGameUseCase {
  start(ctx: Context, data: string): Promise<string>;
  finish(
    ctx: Context,
    token: string,
    score: number,
    duration: number,
  ): Promise<boolean>;
}

const RETRY_COUNT = 3;

const LOG_MESSAGE_START = "ROVI_START";
const LOG_MESSAGE_FINISH = "ROVI_FINISH";

type RoviCommonLog = {
  time: string;
  userId: string;
  tournamentId: string;
  playId: string;
};

type RoviStartLog = RoviCommonLog & {};

type RoviFinishLog = RoviCommonLog & {
  score: number;
  duration: number;
};

type RoviWebhookBody = {
  score: number;
  gameDuration: number;
};

@Service("rovi.useCase")
export class RoviGameUseCaseImpl implements RoviGameUseCase {
  constructor(baseUrl: string = ROVI_WEBHOOK_URL_BASE) {
    this.baseUrl = baseUrl;
  }
  baseUrl: string;

  async start(ctx: Context, data: string): Promise<string> {
    // dataをbase64デコードしてjsonを得る
    const parsedData = this.parseData(data);

    const playId = uuid();
    const logObj: RoviStartLog = {
      time: new Date().toISOString(),
      userId: this.getUserId(parsedData),
      tournamentId: parsedData.contestReferenceId,
      playId: playId,
    };
    ctx.log.info(logObj, LOG_MESSAGE_START);
    return await generateRoviGamePlayToken(playId, data);
  }
  async finish(
    ctx: Context,
    token: string,
    score: number,
    duration: number,
  ): Promise<boolean> {
    let logObj: RoviFinishLog;
    let success = false;

    try {
      const decodedToken = verifyRoviGamePlayToken(token);
      const parsedData = this.parseData(decodedToken.data);

      const url = `${this.baseUrl}/${parsedData.contestReferenceId}/score`;
      logObj = {
        time: new Date().toISOString(),
        userId: this.getUserId(parsedData),
        tournamentId: parsedData.contestReferenceId,
        playId: decodedToken.sub,
        score: score,
        duration: duration,
      };
      const body: RoviWebhookBody = {
        gameDuration: duration,
        score: score,
      };
      const headers = new Headers();
      headers.append("x-api-key", parsedData.xApiKey);
      headers.append("Authorization", parsedData.authorization);
      headers.append("Content-Type", "application/json");
      // 最大RETRY_COUNT回まで再Postする
      for (let i = 0; i < RETRY_COUNT; i++) {
        const res = await fetch(url, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(body),
        });
        if (res.ok) {
          success = true;
          break;
        }
        if (i === RETRY_COUNT - 1) {
          ctx.log.error(
            { response_body: await res.text(), response_status: res.status },
            "rovi error response",
          );
        }
      }
    } catch (e) {
      ctx.log.error(e);
      return false;
    }
    ctx.log.info(logObj, LOG_MESSAGE_FINISH);
    return success;
  }

  parseData(data: string): ParsedData {
    const decodedBytes: Uint8Array = Uint8Array.from(
      atob(data).split(""),
      (c) => c.charCodeAt(0),
    );
    const decodedStr: string = new TextDecoder("utf-8").decode(decodedBytes);
    return JSON.parse(decodedStr) as ParsedData;
  }

  getUserId(parsedData: ParsedData): string {
    return `${parsedData.source}:${parsedData.sourceId}`;
  }
}

type ParsedData = {
  // UserId
  sourceId: string;
  source: string;
  expireTime: number;
  contestReferenceId: string;
  authorization: string;
  xApiKey: string;
};
