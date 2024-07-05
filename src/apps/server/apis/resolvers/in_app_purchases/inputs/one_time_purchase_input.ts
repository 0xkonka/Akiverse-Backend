import "reflect-metadata";
import { Field, InputType } from "type-graphql";

@InputType()
export class GooglePurchaseInput {
  @Field(() => String)
  token: string = "";

  @Field(() => String)
  productId: string = "";
}

@InputType()
export class OneTimePurchaseInput {
  @Field(() => GooglePurchaseInput, { nullable: true })
  google?: GooglePurchaseInput;
}
