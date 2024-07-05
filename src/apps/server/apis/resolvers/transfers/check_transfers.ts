import { Inject, Service } from "typedi";
import { Authorized, Ctx, Info, Query, Resolver } from "type-graphql";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { ProcessingTransferUseCase } from "../../../../../use_cases/processing_transfer_usecase";
import { toResolverError } from "../errors";
import { CheckTransfersOutput } from "./outputs/check_transfers_output";

@Service()
@Resolver()
export class CheckTransfersResolver {
  constructor(
    @Inject("processingTransfer.useCase")
    private readonly useCase: ProcessingTransferUseCase,
  ) {}
  @Query(() => CheckTransfersOutput)
  @Authorized()
  async checkTransfers(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ): Promise<CheckTransfersOutput> {
    ctx = ctx.getChildContext(info);
    try {
      const transfers = await this.useCase.list(ctx);
      return new CheckTransfersOutput(transfers);
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }
}
