import { ArcadePartUseCase } from "../../../../use_cases/arcade_part_usecase";
import { Inject, Service } from "typedi";
import {
  Arg,
  Authorized,
  Ctx,
  FieldResolver,
  Info,
  Mutation,
  Resolver,
  Root,
} from "type-graphql";
import {
  DepositArcadePartInput,
  WithdrawArcadePartInput,
} from "./inputs/arcade_part";
import { Context } from "../../../../context";
import { InvalidArgumentResolverError, toResolverError } from "./errors";
import { ArcadePart } from "@generated/type-graphql";
import { Metadata } from "./outputs/metadata";
import { MetadataUseCase } from "../../../../use_cases/metadata_usecase";
import { GraphQLResolveInfo } from "graphql";

@Service()
@Resolver(() => ArcadePart)
export default class ArcadePartResolver {
  constructor(
    @Inject("arcadePart.useCase")
    private readonly useCase: ArcadePartUseCase,
    @Inject("metadata.useCase")
    private readonly metadataUseCase: MetadataUseCase,
  ) {}

  @Authorized()
  @Mutation(() => [ArcadePart])
  public async withdrawArcadePart(
    @Arg("input") input: WithdrawArcadePartInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    if (!input.ids || input.ids.length === 0) {
      throw new InvalidArgumentResolverError("id required");
    }
    try {
      const arcadePart = await this.useCase.withdraw(ctx, ...input.ids);
      return arcadePart;
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }

  @FieldResolver(() => Metadata)
  async metadata(
    @Root() arcadePart: ArcadePart,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Ctx() ctx: Context,
  ): Promise<Metadata> {
    const ret = await this.metadataUseCase.getArcadePartMetadata(
      ctx,
      arcadePart.id,
    );
    return new Metadata(ret);
  }

  @Authorized()
  @Mutation(() => [ArcadePart])
  public async depositArcadePart(
    @Arg("input") input: DepositArcadePartInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    if (!input.ids || input.ids.length === 0) {
      throw new InvalidArgumentResolverError("id required");
    }
    if (!input.hash) {
      throw new InvalidArgumentResolverError("hash required");
    }
    try {
      return await this.useCase.deposit(ctx, input.hash, ...input.ids);
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }
}
