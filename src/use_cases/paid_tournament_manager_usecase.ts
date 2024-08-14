import { Prisma, PrizeSendStatus } from "@prisma/client";
import prisma from "../prisma";
import {
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
} from "./errors";
import { SpnPayHelper } from "../helpers/spnpay";
import { globalLogger } from "../logger";
import { USDC_DECIMAL_ALIGNMENT_FACTOR } from "../constants";

export interface PaidTournamentManagerUseCase {
  prizeSend(tournamentId: string): Promise<void>;
}

export class PaidTournamentManagerUseCaseImpl
  implements PaidTournamentManagerUseCase {
  helper: SpnPayHelper;
  constructor(key: string, token: string, isSandbox: boolean) {
    this.helper = new SpnPayHelper(key, token, isSandbox);
  }
  async prizeSend(tournamentId: string): Promise<void> {
    const paidTournament = await prisma.paidTournament.findUnique({
      where: { id: tournamentId },
      include: {
        _count: {
          select: {
            entries: true,
          },
        },
      },
    });
    if (!paidTournament) {
      throw new InvalidArgumentUseCaseError("unknown tournament id");
    }
    if (paidTournament.prizeSent) {
      throw new IllegalStateUseCaseError("prize already send");
    }
    if (paidTournament._count.entries <= 0) {
      // 参加者0なので配布もない
      await prisma.paidTournament.update({
        where: { id: tournamentId },
        data: {
          prizeSent: true,
        },
      });
      return;
    }

    const results = await prisma.paidTournamentResult.findMany({
      where: {
        tournamentId: tournamentId,
        prizeTerasAmount: {
          // 入賞者以外も登録されるようになったので賞金があるリザルトに限定
          gt: 0,
        },
      },
    });
    const userIds = results.map((v) => v.userId);
    const entries = await prisma.paidTournamentEntry.findMany({
      where: {
        paidTournamentId: tournamentId,
        userId: {
          in: userIds,
        },
      },
    });
    // resultとentryをマージする
    const prizeSentList = entries.map((v) => {
      const r = results.find((v2) => v2.userId === v.userId)!;
      return {
        entryId: v.id,
        userId: r.userId,
        walletAddress: v.walletAddress,
        phoneNumber: v.phoneNumber,
        prizeSendStatus:
          v.prizeSendStatus === null
            ? PrizeSendStatus.UNPROCESSED
            : v.prizeSendStatus,
        prizeTerasAmount: r.prizeTerasAmount,
        prizeTicketAmount: r.prizeTicketAmount,
        prizeUsdcAmount: r.prizeUsdcAmount,
        prizeIdrAmount: r.prizeIdrAmount,
      };
    });

    let hasFailedRecord = false;
    for (const prizeSentTarget of prizeSentList) {
      if (
        prizeSentTarget.phoneNumber &&
        prizeSentTarget.phoneNumber.length > 0 &&
        prizeSentTarget.prizeSendStatus === PrizeSendStatus.ERROR
      ) {
        // SPNPayでの送金対象で失敗したものに関して、再送すると成功する場合があるのでリトライさせるための暫定処置
        prizeSentTarget.prizeSendStatus = PrizeSendStatus.UNPROCESSED;
      }
      if (prizeSentTarget.prizeSendStatus !== PrizeSendStatus.UNPROCESSED) {
        // すでに送信処理済みのレコードは除外する
        // 再度送信対象にする場合はPaidTournamentEntryのステータスをリセットすること
        continue;
      }
      if (prizeSentTarget.walletAddress) {
        // USDC
        await this.sendCrypt({
          tournamentId: tournamentId,
          userId: prizeSentTarget.userId,
          walletAddress: prizeSentTarget.walletAddress,
          amount: prizeSentTarget.prizeUsdcAmount!,
        });
      } else if (prizeSentTarget.phoneNumber) {
        // SPNPayによるIDR送金
        const spnPaySuccess = await this.sendSpnPay({
          tournamentId: tournamentId,
          entryId: prizeSentTarget.entryId,
          userId: prizeSentTarget.userId,
          phoneNumber: prizeSentTarget.phoneNumber,
          amount: prizeSentTarget.prizeIdrAmount!,
        });
        if (!spnPaySuccess) {
          hasFailedRecord = true;
        }
      } else {
        // Teras
        // await this.sendTeras({
        //   tournamentId: tournamentId,
        //   tournamentTitle: paidTournament.title,
        //   userId: prizeSentTarget.userId,
        //   amount: prizeSentTarget.prizeTerasAmount,
        // });
        if (prizeSentTarget.prizeTerasAmount.toNumber() > 0) {
          await this.sendTeras({
            tournamentId: tournamentId,
            tournamentTitle: paidTournament.title,
            userId: prizeSentTarget.userId,
            amount: prizeSentTarget.prizeTerasAmount,
          });
        }
        if (prizeSentTarget.prizeTicketAmount! > 0) {
          await this.sendTickets({
            userId: prizeSentTarget.userId,
            amount: prizeSentTarget.prizeTicketAmount!,
          });
        }
      }
    }
    // 全て処理終わったら当該トーナメントの賞金配布済みとしてフラグ更新するのだが、SPNPayがランダムに失敗することがあるため、全部成功するまでは更新しない
    if (!hasFailedRecord) {
      await prisma.paidTournament.update({
        where: { id: tournamentId, prizeSent: false },
        data: {
          prizeSent: true,
        },
      });
    }
  }

  async sendTeras({
    tournamentId,
    tournamentTitle,
    userId,
    amount,
  }: SendTerasParams): Promise<void> {
    await prisma.$transaction([
      prisma.reward.create({
        data: {
          userId: userId,
          amount: amount.toNumber(),
          rewardItemType: "TERAS",
          category: "TERAS",
          title: `${tournamentTitle} rank in Prize`,
        },
      }),
      prisma.paidTournamentEntry.update({
        where: {
          paidTournamentId_userId: {
            paidTournamentId: tournamentId,
            userId: userId,
          },
          AND: {
            OR: [
              {
                // Terasの場合、基本的にはUNPROCESSEDにする場面がないためNull or Unprocessedで絞り込む必要がある
                prizeSendStatus: null,
              },
              {
                prizeSendStatus: PrizeSendStatus.UNPROCESSED,
              },
            ],
          },
        },
        data: {
          prizeSendStatus: PrizeSendStatus.CONFIRMED,
        },
      }),
    ]);
  }

  async sendTickets({
    userId,
    amount,
  }: {
    userId: string;
    amount: number;
  }): Promise<void> {
    await prisma.reward.create({
      data: {
        userId: userId,
        amount: amount,
        rewardItemType: "TICKET",
        category: "TICKET",
        title: "Tournament Prize",
      },
    });
  }

  async sendCrypt({
    tournamentId,
    userId,
    walletAddress,
    amount,
  }: SendCryptParams): Promise<void> {
    await prisma.$transaction([
      prisma.currencyWithdrawal.create({
        data: {
          userId: userId,
          walletAddress: walletAddress,
          amount: amount.mul(USDC_DECIMAL_ALIGNMENT_FACTOR),
          currencyType: "USDC",
        },
      }),
      prisma.paidTournamentEntry.update({
        where: {
          paidTournamentId_userId: {
            paidTournamentId: tournamentId,
            userId: userId,
          },
          prizeSendStatus: PrizeSendStatus.UNPROCESSED,
        },
        data: {
          prizeSendStatus: PrizeSendStatus.CONFIRMED,
        },
      }),
    ]);
  }

  async sendSpnPay({
    tournamentId,
    entryId,
    userId,
    phoneNumber,
    amount,
  }: SendSpnPayParams): Promise<boolean> {
    // 2度投げないように先に処理済みに更新
    await prisma.paidTournamentEntry.update({
      where: {
        paidTournamentId_userId: {
          paidTournamentId: tournamentId,
          userId: userId,
        },
        prizeSendStatus: {
          // リトライも処理できるようにErrorも対象とする
          in: [PrizeSendStatus.UNPROCESSED, PrizeSendStatus.ERROR],
        },
      },
      data: {
        prizeSendStatus: PrizeSendStatus.PENDING,
      },
    });
    let returnValue = true;
    await prisma.$transaction(
      async (tx) => {
        let resStatus;
        try {
          // SPNPayに投げる
          resStatus = await this.helper.send({
            entryId: entryId,
            phoneNumber: phoneNumber,
            amount: amount,
          });
        } catch (e: unknown) {
          globalLogger.error(e);
          resStatus = "failed";
        }

        let updateStatus;
        switch (resStatus) {
          case "success":
            updateStatus = PrizeSendStatus.CONFIRMED;
            break;
          case "failed":
            updateStatus = PrizeSendStatus.ERROR;
            returnValue = false;
            break;
          default:
            updateStatus = PrizeSendStatus.PENDING;
        }
        // DB更新する
        await tx.paidTournamentEntry.update({
          where: {
            paidTournamentId_userId: {
              paidTournamentId: tournamentId,
              userId: userId,
            },
            prizeSendStatus: PrizeSendStatus.PENDING,
          },
          data: {
            prizeSendStatus: updateStatus,
          },
        });
      },
      {
        // SPNPayが外部APIなので長めにタイムアウト設定
        timeout: 10000,
      },
    );
    return returnValue;
  }
}

type SendTerasParams = {
  tournamentId: string;
  tournamentTitle: string;
  userId: string;
  amount: Prisma.Decimal;
};

type SendCryptParams = {
  tournamentId: string;
  userId: string;
  walletAddress: string;
  amount: Prisma.Decimal;
};

type SendSpnPayParams = {
  tournamentId: string;
  entryId: string;
  userId: string;
  phoneNumber: string;
  amount: Prisma.Decimal;
};
