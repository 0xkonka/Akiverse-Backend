import "reflect-metadata";

import { Inject, Service } from "typedi";
import { Arg, Authorized, Ctx, Info, Mutation, Resolver } from "type-graphql";
import { GooglePlayUseCase } from "../../../../../use_cases/in_app_purchases/google_play";
import { AppStoreConnectUseCase } from "../../../../../use_cases/in_app_purchases/app_store_connect";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { OneTimePurchaseInput } from "./inputs/one_time_purchase_input";
import { InvalidArgumentResolverError, toResolverError } from "../errors";

@Service()
@Resolver()
export class OneTimePurchaseResolver {
  constructor(
    @Inject("google.useCase") private readonly google: GooglePlayUseCase,
    @Inject("apple.useCase") private readonly apple: AppStoreConnectUseCase,
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
    } else if (input.apple) {
      try {
        await this.apple.verifyOneTimePurchase(ctx, input.apple);
        return true;
      } catch (e: unknown) {
        throw toResolverError(ctx, e);
      }
    } else {
      throw new InvalidArgumentResolverError("purchase info required");
    }
  }
}
