import { Field, InputType, Int } from "type-graphql";
import { ArcadePartCategory } from "@generated/type-graphql";

@InputType()
export class SwapJunkToArcadePartsInput {
  @Field(() => ArcadePartCategory)
  category: ArcadePartCategory = ArcadePartCategory.ROM;

  @Field(() => String)
  subCategory: string = "";

  @Field(() => Int)
  quantity: number = 0;
}
