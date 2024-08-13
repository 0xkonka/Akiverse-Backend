import { Context } from "../../context";

import { ConflictUseCaseError } from "../errors";
import { getPurchaseItem } from "./items";
import { PRISMA_UNIQUE_CONSTRAINT_ERROR_CODE } from "../../prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { Service } from "typedi";
import { writePurchaseTicketTransaction } from "../../helpers/ticket_transaction";
import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
  ReceiptUtility,
  JWSTransactionDecodedPayload,
} from "@apple/app-store-server-library";
import { APPLE_ROOT_CERTIFICATES } from "../../constants";

type Params = {
  productId: string;
  receipt: string;
};
export interface AppStoreConnectUseCase {
  verifyOneTimePurchase(ctx: Context, params: Params): Promise<void>;
}
@Service()
export class AppStoreConnectUseCaseImpl implements AppStoreConnectUseCase {
  private readonly apiClient: AppStoreServerAPIClient;
  private readonly verifier: SignedDataVerifier;
  constructor(
    encodedKey: string,
    keyId: string,
    issuerId: string,
    bundleId: string,
    environment: Environment,
  ) {
    this.apiClient = new AppStoreServerAPIClient(
      encodedKey,
      keyId,
      issuerId,
      bundleId,
      environment,
    );
    this.verifier = new SignedDataVerifier(
      APPLE_ROOT_CERTIFICATES,
      true,
      environment,
      "io.akiverse",
    );
  }
  async verifyOneTimePurchase(
    ctx: Context,
    { productId, receipt }: Params,
  ): Promise<void> {
    // first create a record
    const inserted = await ctx.prisma.appleOneTimePurchase.create({
      data: {
        userId: ctx.userId!,
        productId,
        receipt,
        status: "UNPROCESSED",
      },
    });
    // validate with apple
    try {
      // example code from https://apple.github.io/app-store-server-library-node/
      const receiptUtil = new ReceiptUtility();
      const transactionId =
        receiptUtil.extractTransactionIdFromAppReceipt(receipt);
      if (transactionId != null) {
        const { signedTransactionInfo } =
          await this.apiClient.getTransactionInfo(transactionId);
        if (!signedTransactionInfo) {
          throw new Error("Response missing signedTransactionInfo");
        }
        // https://apple.github.io/app-store-server-library-node/interfaces/JWSTransactionDecodedPayload.html
        const decoded: JWSTransactionDecodedPayload =
          await this.verifier.verifyAndDecodeTransaction(signedTransactionInfo);
        if (decoded.productId == productId) {
          // looks valid. go ahead and process the purchase
          // TODO: maybe there are more things we should validate. Check docs.
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
            await tx.appleOneTimePurchase.update({
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
            // Throws APIException if there was a problem; no return value
            await this.apiClient.sendConsumptionData(transactionId, {
              appAccountToken: inserted.id,
              consumptionStatus: 3, // fully consumed
            });
          });
        } else {
          // mark invalid
          await ctx.prisma.appleOneTimePurchase.update({
            where: {
              id: inserted.id,
              status: "UNPROCESSED",
            },
            data: {
              status: "INVALID",
              signedResponse: signedTransactionInfo,
              responseDetail: JSON.stringify(decoded),
            },
          });
        }
      }
    } catch (e: unknown) {
      // Insertで重複エラーの時はコンフリクトを返す
      // それ以外のエラーの時、appleOneTimePurchasesのレコードが存在するはずなので更新する
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
      await ctx.prisma.appleOneTimePurchase.update({
        where: {
          id: inserted.id,
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
