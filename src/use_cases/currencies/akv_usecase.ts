import { Prisma } from "@prisma/client";
import { Context } from "../../context";
import { withdrawAkv } from "../../helpers/withdraw";
import { depositAkv } from "../../helpers/deposit";
import { Service } from "typedi";

export interface AKVUseCase {
  deposit(
    ctx: Context,
    transactionHash: string,
    amount: Prisma.Decimal,
  ): Promise<void>;
  withdraw(ctx: Context, amount: Prisma.Decimal): Promise<void>;
}

@Service()
export class AKVUseCaseImpl implements AKVUseCase {
  async deposit(
    ctx: Context,
    transactionHash: string,
    amount: Prisma.Decimal,
  ): Promise<void> {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    await depositAkv(user, transactionHash, amount);
  }

  async withdraw(ctx: Context, amount: Prisma.Decimal): Promise<void> {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    await withdrawAkv(user, amount);
  }
}
