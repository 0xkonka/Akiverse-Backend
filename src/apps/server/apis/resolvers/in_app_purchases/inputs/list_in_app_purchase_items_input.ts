import { ArgsType, Field } from "type-graphql";
import { OperatingSystem } from "@generated/type-graphql";

@ArgsType()
export class ListInAppPurchaseItemsInput {
  @Field(() => OperatingSystem)
  os: OperatingSystem = OperatingSystem.ANDROID;
}
