import { Context } from "../../../src/context";
import {
  GetRankingResponse,
  PaidTournamentUseCase,
} from "../../../src/use_cases/paid_tournament_usecase";
import { PaidTournamentEntry, PrizeSendStatus } from "@prisma/client";

export class PaidTournamentUseCaseMock implements PaidTournamentUseCase {
  returnValueForEntry: PaidTournamentEntry | null = null;
  throwErrorForEntry: any | null = null;

  returnValueForGetRanking: GetRankingResponse | null = null;
  throwErrorForGetRanking: any | null = null;

  reset() {
    this.returnValueForEntry = null;
    this.throwErrorForEntry = null;
    this.returnValueForGetRanking = null;
    this.throwErrorForGetRanking = null;
  }

  async enter(
    ctx: Context,
    tournamentId: string,
  ): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    usedTickets: number;
    countryFromIp: string | null;
    paidTournamentId: string;
    prizeClaimed: boolean;
    walletAddress: string | null;
    phoneNumber: string | null;
    prizeSendStatus: PrizeSendStatus | null;
  }> {
    if (this.throwErrorForEntry) throw this.throwErrorForEntry;
    if (!this.returnValueForEntry) throw new Error("setup failed");
    return this.returnValueForEntry;
  }

  async getRanking(
    ctx: Context,
    tournamentId: string,
  ): Promise<GetRankingResponse> {
    if (this.throwErrorForGetRanking) throw this.throwErrorForGetRanking;
    if (!this.returnValueForGetRanking) throw new Error("setup failed");
    return this.returnValueForGetRanking;
  }

  async claimPrize(
    ctx: Context,
    tournamentId: string,
    transfer: {
      walletAddress?: string;
      phoneNumber?: string;
    },
  ): Promise<void> {
    return Promise.resolve(undefined);
  }
}
