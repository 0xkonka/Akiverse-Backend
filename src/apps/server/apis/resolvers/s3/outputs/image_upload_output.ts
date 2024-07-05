import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class PrepareImageUploadOutput {
  constructor(preSignedUrl: string, imageUrl: string) {
    this.preSignedUrl = preSignedUrl;
    this.imageUrl = imageUrl;
  }
  @Field(() => String)
  preSignedUrl: string;

  @Field(() => String)
  imageUrl: string;
}
