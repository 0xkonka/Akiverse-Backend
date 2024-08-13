import "reflect-metadata";

import { Context } from "../context";
import { Service } from "typedi";

export interface UnsubscribeUseCase {
  getEmailFromToken(
    ctx: Context,
    unsubscribeToken: string,
  ): Promise<string | null>;
  unsubscribeUser(ctx: Context, unsubscribeToken: string): Promise<void>;
}

@Service()
export class UnsubscribeUseCaseImpl implements UnsubscribeUseCase {
  async getEmailFromToken(
    ctx: Context,
    unsubscribeToken: string,
  ): Promise<string | null> {
    const user = await ctx.prisma.user.findUnique({
      where: { unsubscribeToken },
    });
    if (user) {
      return user.email;
    }
    return null;
  }

  async unsubscribeUser(ctx: Context, email: string): Promise<void> {
    await ctx.prisma.user.update({
      where: { email },
      data: { receiveBulkEmail: false },
    });
  }
}
