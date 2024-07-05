import { Field, InputType } from "type-graphql";
import { IconType } from "@generated/type-graphql";

@InputType()
export class UpdateUserInput {
  @Field()
  name: string = "";

  @Field(() => IconType)
  iconType: IconType = IconType.IN_WORLD;

  @Field()
  iconSubCategory: string = "";

  @Field()
  titleSubCategory: string = "";

  @Field()
  frameSubCategory: string = "";
}
