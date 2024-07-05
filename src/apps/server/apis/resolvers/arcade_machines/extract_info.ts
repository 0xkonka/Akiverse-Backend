import { Inject, Service } from "typedi";
import { ExtractUseCase } from "../../../../../use_cases/extract_usecase";
import { Ctx, FieldResolver, Resolver, Root } from "type-graphql";
import { ArcadeMachine } from "@generated/type-graphql";
import { Context } from "../../../../../context";
import { toResolverError } from "../errors";
import { ExtractInfoOutput } from "./output/extract_info_output";

@Service()
@Resolver(() => ArcadeMachine)
export default class ExtractInfoResolver {
  constructor(
    @Inject("extract.useCase")
    private readonly useCase: ExtractUseCase,
  ) {}

  @FieldResolver(() => ExtractInfoOutput)
  async extractInfo(
    @Root() arcadeMachine: ArcadeMachine,
    @Ctx() ctx: Context,
  ): Promise<ExtractInfoOutput> {
    try {
      const ret = await this.useCase.minNumberOfExtractItems(
        ctx,
        arcadeMachine.accumulatorSubCategory,
        arcadeMachine.energy,
        arcadeMachine.extractedEnergy,
      );
      return new ExtractInfoOutput(ret.count, ret.extractCode);
    } catch (e: unknown) {
      throw toResolverError(ctx, e);
    }
  }
}
