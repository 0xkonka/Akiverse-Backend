import { Context } from "../../../../../context";
import { Arg, Authorized, Ctx, Info, Mutation } from "type-graphql";
import { Inject, Service } from "typedi";
import { ArcadeMachine } from "@generated/type-graphql";
import { CraftInput, CraftPartInput } from "./inputs/craft";
import { InvalidArgumentResolverError, toResolverError } from "../errors";
import {
  CraftPartType,
  CraftUseCase,
} from "../../../../../use_cases/craft_usecase";
import { GraphQLResolveInfo } from "graphql";
import { ArcadePartCategory } from "@prisma/client";

@Service()
export default class CraftResolver {
  constructor(
    @Inject("craft.useCase") private readonly useCase: CraftUseCase,
  ) {}
  @Authorized()
  @Mutation(() => ArcadeMachine)
  async craft(
    @Arg("input") input: CraftInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);

    if (!input.isValid()) {
      throw new InvalidArgumentResolverError(
        "all arcade parts id/category is required",
      );
    }
    const parts = new Array<CraftPartType>();

    parts.push(
      this.convertInputToCraftPartType(input.rom!, ArcadePartCategory.ROM),
    );
    parts.push(
      this.convertInputToCraftPartType(
        input.accumulator!,
        ArcadePartCategory.ACCUMULATOR,
      ),
    );
    parts.push(
      this.convertInputToCraftPartType(
        input.lowerCabinet!,
        ArcadePartCategory.LOWER_CABINET,
      ),
    );
    parts.push(
      this.convertInputToCraftPartType(
        input.upperCabinet!,
        ArcadePartCategory.UPPER_CABINET,
      ),
    );

    try {
      return await this.useCase.craft(ctx, parts, input.usedCurrency);
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }

  private convertInputToCraftPartType(
    input: CraftPartInput,
    category: ArcadePartCategory,
  ): CraftPartType {
    return input.tokenId
      ? { category, tokenId: input.tokenId, useJunk: false }
      : { category, subCategory: input.subCategory!, useJunk: true };
  }
}
