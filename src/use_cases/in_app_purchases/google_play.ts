import { Context } from "../../context";

import { google } from "googleapis";
import { JWT } from "google-auth-library";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  InternalServerUseCaseError,
} from "../errors";
import { getPurchaseItem } from "./items";
import { PRISMA_UNIQUE_CONSTRAINT_ERROR_CODE } from "../../prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { Service } from "typedi";
import { writePurchaseTicketTransaction } from "../../helpers/ticket_transaction";

const ANDROID_PACKAGE_NAME = "io.akiverse.arcade";

type Params = {
  productId: string;
  token: string;
};
export interface GooglePlayUseCase {
  verifyOneTimePurchase(ctx: Context, params: Params): Promise<void>;
}
@Service()
export class GooglePlayUseCaseImpl implements GooglePlayUseCase {
  private readonly androidGoogleApi;
  constructor(playStoreEmail: string, playStoreKey: string) {
    google.options({
      auth: new JWT(
        playStoreEmail,
        undefined,
        playStoreKey.replace(/\\n/g, "\n"),
        ["https://www.googleapis.com/auth/androidpublisher"],
      ),
    });
    this.androidGoogleApi = google.androidpublisher({ version: "v3" });
  }
  async verifyOneTimePurchase(
    ctx: Context,
    { productId, token }: Params,
  ): Promise<void> {
    let purchaseRecordId;
    try {
      const purchase = await this.androidGoogleApi.purchases.products.get({
        productId: productId,
        packageName: ANDROID_PACKAGE_NAME,
        token: token,
      });

      if (purchase.status > 399) {
        throw new InternalServerUseCaseError(
          `store api response failed. status: ${purchase.status}`,
        );
      }

      // トークン自体は正しいことがわかったのでバックエンドの処理実行
      const inserted = await ctx.prisma.googleOneTimePurchase.create({
        data: {
          userId: ctx.userId!,
          purchaseToken: token,
          productId: productId,
          status: "UNPROCESSED",
          purchaseDetail: JSON.stringify(purchase.data),
        },
      });
      purchaseRecordId = inserted.id;
      if (
        purchase.data.purchaseState !== 0 ||
        purchase.data.acknowledgementState !== 0
      ) {
        throw new IllegalStateUseCaseError(
          "purchase status or acknowledgement state is invalid",
        );
      }

      const item = getPurchaseItem(productId);

      // トランザクション内で処理することでConsumeに失敗した場合にロールバックするようにする
      await ctx.prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: {
            id: ctx.userId!,
          },
          data: {
            tickets: {
              increment: item.ticketCount,
            },
          },
        });

        await tx.googleOneTimePurchase.update({
          where: {
            id: inserted.id,
            status: "UNPROCESSED",
          },
          data: {
            status: "GRANTED",
          },
        });
        await writePurchaseTicketTransaction(
          ctx,
          user.tickets,
          item.ticketCount,
          "ANDROID",
          inserted.id,
        );
        // 現状では消費型アイテムしか存在しないのでConsumeする
        // 今後非消費型アイテムを販売する場合は場合わけが必要
        const consumed = await this.androidGoogleApi.purchases.products.consume(
          {
            productId: productId,
            packageName: ANDROID_PACKAGE_NAME,
            token: token,
          },
        );
        if (consumed.status > 399) {
          // 正常終了以外はエラーにする
          throw new InternalServerUseCaseError(
            `consume status code failed. status: ${consumed.status}`,
          );
        }
      });
    } catch (e: unknown) {
      // Insertで重複エラーの時はコンフリクトを返す
      // それ以外のエラーの時、googleOneTimePurchasesのレコードが存在するはずなので更新する
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === PRISMA_UNIQUE_CONSTRAINT_ERROR_CODE) {
          throw new ConflictUseCaseError("in app purchases conflict");
        }
      }
      let msg: string;
      if (e instanceof Error) {
        msg = JSON.stringify({
          message: e.message,
          stack: e.stack,
        });
      } else {
        msg = `${e}`;
      }
      // @ts-ignore
      await ctx.prisma.googleOneTimePurchase.update({
        where: {
          id: purchaseRecordId,
        },
        data: {
          errorDetail: msg,
        },
      });
      // コンフリクト以外は投げ元の例外をそのまま投げる
      throw e;
    }
  }
}
