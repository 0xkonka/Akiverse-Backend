import "reflect-metadata";

import { Inject, Service } from "typedi";
import { Arg, Authorized, Ctx, Info, Mutation, Resolver } from "type-graphql";
import { GooglePlayUseCase } from "../../../../../use_cases/in_app_purchases/google_play";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { OneTimePurchaseInput } from "./inputs/one_time_purchase_input";
import { InvalidArgumentResolverError, toResolverError } from "../errors";

@Service()
@Resolver()
export class OneTimePurchaseResolver {
  constructor(
    @Inject("google.useCase") private readonly google: GooglePlayUseCase,
  ) {}

  @Authorized()
  @Mutation(() => Boolean)
  async purchaseOneTime(
    @Arg("input") input: OneTimePurchaseInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    if (input.google) {
      try {
        await this.google.verifyOneTimePurchase(ctx, input.google);
        return true;
      } catch (e: unknown) {
        throw toResolverError(ctx, e);
      }
    } else {
      // Appleに対応したら実装変更
      throw new InvalidArgumentResolverError("purchase info required");
    }
  }
}
