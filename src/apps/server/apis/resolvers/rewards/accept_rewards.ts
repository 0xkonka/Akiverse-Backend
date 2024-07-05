import { Inject, Service } from "typedi";
import { Authorized, Ctx, Info, Mutation, Resolver } from "type-graphql";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { RewardUseCase } from "../../../../../use_cases/reward_usecase";
import { AcceptRewardsOutput } from "./outputs/accept_rewards_output";
import { toResolverError } from "../errors";

@Service()
@Resolver()
export class ReceiveRewardsResolver {
  constructor(
    @Inject("reward.useCase")
    private readonly useCase: RewardUseCase,
  ) {}
  @Authorized()
  @Mutation(() => AcceptRewardsOutput)
  async acceptRewardAll(@Ctx() ctx: Context, @Info() info: GraphQLResolveInfo) {
    ctx = ctx.getChildContext(info);
    try {
      const useCaseRet = await this.useCase.acceptAll(ctx);

      return new AcceptRewardsOutput(useCaseRet);
    } catch (e: unknown) {
      throw toResolverError(ctx, e);
    }
  }
}
