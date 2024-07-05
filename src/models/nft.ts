import { ArcadeMachine, ArcadePart, GameCenter } from "@prisma/client";

// findUnique({include: {User: {select: {id: true, walletAddress: true}}}})の返却型

type UserIdAndWallet = { id: string; walletAddress: string | null };

export type GameCenterWithUser = GameCenter & { user: UserIdAndWallet | null };
export type ArcadeMachineWithUser = ArcadeMachine & {
  user: UserIdAndWallet | null;
};
export type ArcadePartWithUser = ArcadePart & { user: UserIdAndWallet | null };
