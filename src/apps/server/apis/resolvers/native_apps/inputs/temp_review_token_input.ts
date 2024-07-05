import { OperatingSystem } from "@generated/type-graphql";
import { Field, InputType } from "type-graphql";

@InputType()
export class TempReviewTokenInput {
  @Field(() => OperatingSystem)
  os: OperatingSystem = OperatingSystem.ANDROID;

  @Field(() => String)
  version: string = "";

  @Field(() => String)
  emailAddress: string = "";
}
