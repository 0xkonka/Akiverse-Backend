import * as crypto from "node:crypto";
import prisma from "../prisma";
import { Prisma, PrizeSendStatus } from "@prisma/client";
import { InvalidArgumentUseCaseError } from "../use_cases/errors";
import { Context } from "../context";
import { PhoneNumberFormat, PhoneNumberUtil } from "google-libphonenumber";
import { v4 as uuidv4 } from "uuid";

export type DisburseParams = {
  bankCode: string;
  recipientAccount: string;
  reference: string;
  amount: number;
  additionalInfo: {
    callback: string;
  };
};

const phoneNumberUtil = PhoneNumberUtil.getInstance();

type SendResponse = "success" | "failed" | "pending";

/**
 * SPN Payを用いた送金処理ヘルパークラス
 * API docs https://documenter.getpostman.com/view/16670352/2s9YC4TsBB
 */
export class SpnPayHelper {
  private readonly endpoint: string;
  private readonly callback: string;
  constructor(
    private readonly key: string,
    private readonly token: string,
    isSandbox: boolean,
  ) {
    console.log(`isSandbox: ${isSandbox}`);
    if (isSandbox) {
      this.endpoint = "https://api.sandbox.cronosengine.com/api";
      this.callback = "https://apis.staging.akiverse.io/notify/spnpay";
    } else {
      this.endpoint = "https://partner-api.spnpay.com/api";
      this.callback = "https://api.akiverse.io/notify/spnpay";
    }
  }

  /**
   * SPN Pay Disburse APIを使って送金する
   * @param entryId PaidTournamentEntryId
   * @param phoneNumber phoneNumber
   * @param amount IDR amount
   */
  async send({
    entryId,
    phoneNumber,
    amount,
  }: SendParams): Promise<SendResponse> {
    if (amount.lt(new Prisma.Decimal(1000))) {
      throw new InvalidArgumentUseCaseError(
        "send minimum amount grater than 10000",
      );
    }

    const parsedPhoneNumber = phoneNumberUtil.parse(phoneNumber);
    if (!phoneNumberUtil.isValidNumber(parsedPhoneNumber)) {
      throw new InvalidArgumentUseCaseError("invalid phone number");
    }

    // 国コード・区切りなしのフォーマットに変換
    const formatedPhoneNumber = phoneNumberUtil
      .format(parsedPhoneNumber, PhoneNumberFormat.NATIONAL)
      .replaceAll("-", "");

    // spnPaySend.idを生成（Bodyに入れる必要があるため
    const id = uuidv4();

    const payload: DisburseParams = {
      bankCode: "ovo",
      recipientAccount: formatedPhoneNumber,
      amount: amount.toNumber(),
      reference: id,
      additionalInfo: {
        callback: this.callback,
      },
    };

    const signature = this.generateSignature(payload);
    const myHeaders = new Headers();
    myHeaders.append("On-Key", this.key);
    myHeaders.append("On-Token", this.token);
    myHeaders.append("On-Signature", signature);
    myHeaders.append("Content-Type", "application/json");
    const raw = phpStyleJsonEncode(payload);

    // 投げる前に投げる情報を保存
    await prisma.spnPaySend.create({
      data: {
        id: id,
        paidTournamentEntryId: entryId,
        body: raw,
      },
    });

    const res = await fetch(this.endpoint + "/disburse", {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    });
    let responseStatus: SendResponse;
    const message = await res.text();
    const jsonParsed = JSON.parse(message) as SpnPayDisburseResponsePayload;
    if (jsonParsed) {
      if (jsonParsed.responseData.status.toUpperCase() === "SUCCESS") {
        responseStatus = "success";
      } else if (jsonParsed.responseData.status.toUpperCase() === "PENDING") {
        responseStatus = "pending";
      } else {
        responseStatus = "failed";
      }
    } else {
      responseStatus = "failed";
    }

    // SPNPayResultのレコードは別トランザクションで保存する
    await prisma.spnPayResult.create({
      data: {
        spnPaySendId: id,
        response: message,
      },
    });
    return responseStatus;
  }

  generateSignature(payload: any): string {
    const bodyString = phpStyleJsonEncode(payload);
    const message = this.key + bodyString;

    const hmac = crypto.createHmac("sha512", this.token);
    const signature = hmac.update(message).digest("hex");

    return signature;
  }

  /**
   * SPNPayのトランザクションIDを引数に詳細を取得する
   * 検証用
   * Check APIでトランザクションの最新状況を取得してログ出力する
   * @param transactionId SpnPayResultのresponseに含まれるID(SPN Payが採番するID)
   */
  async checkTransaction(transactionId: string) {
    //
    const signature = crypto
      .createHmac("sha512", this.token)
      .update(this.key)
      .digest("hex");
    const myHeaders = new Headers();
    myHeaders.append("On-Key", this.key);
    myHeaders.append("On-Token", this.token);
    myHeaders.append("On-Signature", signature);
    myHeaders.append("Content-Type", "application/json");
    const res = await fetch(this.endpoint + "/check/" + transactionId, {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
    });
    console.log(await res.text());
  }
}

/**
 * PHPのjson_encodeの仕様と合わせるためにJSON.stringifyした後にスラッシュをエスケープしたJSONを返す
 * @param data
 */
function phpStyleJsonEncode(data: any): string {
  const jsonString = JSON.stringify(data);
  return jsonString.replace(/\//g, "\\/");
}

/**
 * SPN Payのコールバック結果を保存・解析する
 * @param ctx
 * @param payload
 */
export async function saveCallbackInfo(
  ctx: Context,
  payload: any,
): Promise<boolean> {
  try {
    const typedPayload = payload as SpnPayDisburseResponsePayload;
    const sendId = typedPayload.responseData.merchantRef;
    const send = await prisma.spnPaySend.findUnique({
      where: { id: sendId },
    });
    if (!send) {
      ctx.log.warn(`SPNPay callback. SpnPay.id not found.[${sendId}`);
      return false;
    }
    const entry = await prisma.paidTournamentEntry.findUnique({
      where: {
        id: send.paidTournamentEntryId,
      },
    });
    if (!entry) {
      ctx.log.warn(
        `SPNPay callback.entryId nou found.[${send.paidTournamentEntryId}]`,
      );
      return false;
    }

    let status;
    const resStatus = typedPayload.responseData.status.toUpperCase();
    if (resStatus === "SUCCESS") {
      status = PrizeSendStatus.CONFIRMED;
    } else if (
      // failed/expiredはエラーとして処理する
      resStatus === "FAILED" ||
      resStatus === "EXPIRED"
    ) {
      status = PrizeSendStatus.ERROR;
    } else {
      // pending状態だったらそのまま
      status = entry.prizeSendStatus;
    }
    const queries = [];
    queries.push(
      ctx.prisma.paidTournamentEntry.update({
        where: {
          id: send.paidTournamentEntryId,
        },
        data: {
          prizeSendStatus: status,
        },
      }),
    );
    queries.push(
      ctx.prisma.spnPayResult.create({
        data: {
          spnPaySendId: sendId,
          response: JSON.stringify(payload),
        },
      }),
    );
    await ctx.prisma.$transaction(queries);
    return true;
  } catch (e: unknown) {
    return false;
  }
}

type SpnPayDisburseResponsePayload = {
  responseCode: number;
  responseMessage: string;
  responseData: {
    // SPN Payが採番したID
    id: string;
    // Akiverseが採番したID=SpnPaySend.id
    merchantRef: string;
    status: string;
    feePayer: string;
    amount: number;
    fee: number;
    totalAmount: number;
    expiredDate: Date;
    additionalInfo: {
      callback: string;
    };
    disbursement: {
      bankCode: string;
      recipientAccount: string;
      recipientName: string;
    };
  };
};

type SendParams = {
  entryId: string;
  phoneNumber: string;
  amount: Prisma.Decimal;
};
