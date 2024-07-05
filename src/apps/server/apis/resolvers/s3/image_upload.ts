import { Inject, Service } from "typedi";
import { Arg, Authorized, Ctx, Info, Mutation, Resolver } from "type-graphql";
import { Context } from "../../../../../context";
import { ROLES } from "../../../auth";
import { PrepareImageUploadOutput } from "./outputs/image_upload_output";
import { GraphQLResolveInfo } from "graphql";
import { PrepareImageUploadInput } from "./inputs/image_upload_input";
import { toResolverError } from "../errors";
import { ImageUploadUseCase } from "../../../../../use_cases/image_upload_usecase";

@Service()
@Resolver()
export default class S3ImageUploadResolver {
  constructor(
    @Inject("imageUpload.useCase") private readonly useCase: ImageUploadUseCase,
  ) {}

  /**
   * prepareImageUpload
   * フロントエンドからS3に画像をアップロードするための署名URLを返す
   */
  @Mutation(() => PrepareImageUploadOutput)
  @Authorized(ROLES.ADMIN)
  async prepareImageUpload(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
    @Arg("input") input: PrepareImageUploadInput,
  ): Promise<PrepareImageUploadOutput> {
    ctx = ctx.getChildContext(info);
    try {
      const ret = await this.useCase.prepareUploadImage(
        ctx,
        // fileName bannerImageTypeはGraphQLレイヤーで必須の制約をかけているので必ずundefinedではない
        input.fileName!,
        input.bannerImageType!,
        input.description,
      );
      return new PrepareImageUploadOutput(ret.preSignedUploadUrl, ret.imageUrl);
    } catch (e: unknown) {
      throw toResolverError(ctx, e);
    }
  }
}
