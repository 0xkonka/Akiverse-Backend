import { Authorized, Ctx, Info, Query, Resolver } from "type-graphql";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { Inject, Service } from "typedi";
import { ProfilePictureNftUseCase } from "../../../../../use_cases/eth_nfts/profile_picture_nft_usecase";
import { ListNFTsOutput } from "./outputs/list_nfts_output";

@Service()
@Resolver(() => ListNFTsOutput)
export class ListOwnedNFTsResolver {
  constructor(
    @Inject("nfts.useCase")
    private readonly useCase: ProfilePictureNftUseCase,
  ) {}

  @Authorized()
  @Query(() => [ListNFTsOutput])
  async listOwnedNFTs(@Ctx() ctx: Context, @Info() info: GraphQLResolveInfo) {
    ctx = ctx.getChildContext(info);
    return await this.useCase.listProfileIconImages(ctx);
  }
}
