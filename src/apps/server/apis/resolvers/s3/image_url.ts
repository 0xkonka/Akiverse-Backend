import { Inject, Service } from "typedi";
import { FieldResolver, Resolver, Root } from "type-graphql";
import { BannerImage } from "@generated/type-graphql";
import { ImageUploadUseCase } from "../../../../../use_cases/image_upload_usecase";

@Service()
@Resolver(() => BannerImage)
export default class ImageUrlFieldResolver {
  constructor(
    @Inject("imageUpload.useCase") private readonly useCase: ImageUploadUseCase,
  ) {}
  @FieldResolver(() => String)
  async imageUrl(@Root() bannerImage: BannerImage) {
    return this.useCase.getImageUrl(bannerImage.s3Path);
  }
}
