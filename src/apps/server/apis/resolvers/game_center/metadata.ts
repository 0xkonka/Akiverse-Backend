import { Ctx, FieldResolver, Info, Resolver, Root } from "type-graphql";
import { GameCenter } from "@generated/type-graphql";
import { Context } from "../../../../../context";
import { Inject, Service } from "typedi";
import { Metadata } from "../outputs/metadata";
import { MetadataUseCase } from "../../../../../use_cases/metadata_usecase";
import { GraphQLResolveInfo } from "graphql";

@Service()
@Resolver(() => GameCenter)
export default class GameCenterMetadataFieldResolver {
  constructor(
    @Inject("metadata.useCase")
    private readonly metadataUseCase: MetadataUseCase,
  ) {}

  @FieldResolver(() => Metadata)
  async metadata(
    @Root() gameCenter: GameCenter,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ): Promise<Metadata> {
    ctx = ctx.getChildContext(info);
    const ret = await this.metadataUseCase.getGameCenterMetadata(
      ctx,
      gameCenter.id,
    );
    return new Metadata(ret);
  }
}
