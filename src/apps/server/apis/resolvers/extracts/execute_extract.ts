import { Inject, Service } from "typedi";
import { ExtractUseCase } from "../../../../../use_cases/extract_usecase";
import { Context } from "../../../../../context";
import { Arg, Authorized, Ctx, Info, Mutation, Resolver } from "type-graphql";
import { GraphQLResolveInfo } from "graphql";
import { ExecuteExtractInput } from "./inputs/execute_extract_input";
import { ExecuteExtractOutput } from "./outputs/execute_extract_ouput";
import { toResolverError } from "../errors";

@Service()
@Resolver()
export class ExecuteExtractResolver {
  constructor(
    @Inject("extract.useCase")
    private readonly useCase: ExtractUseCase,
  ) {}

  @Authorized()
  @Mutation(() => [ExecuteExtractOutput])
  async executeExtract(
    @Arg("input") input: ExecuteExtractInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ): Promise<Array<typeof ExecuteExtractOutput>> {
    ctx = ctx.getChildContext(info);
    try {
      return await this.useCase.extract(
        ctx,
        input.arcadeMachineId,
        input.extractCode,
        input.usedCurrency,
      );
    } catch (e: unknown) {
      throw toResolverError(ctx, e);
    }
  }
}
