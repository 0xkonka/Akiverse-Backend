import { Field, InputType } from "type-graphql";
import { BannerImageType } from "@generated/type-graphql";

@InputType()
export class PrepareImageUploadInput {
  @Field(() => String)
  fileName?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => BannerImageType)
  bannerImageType?: BannerImageType;
}
