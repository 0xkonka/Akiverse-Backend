import "reflect-metadata";

import { OperatingSystem } from "@generated/type-graphql";
import { ArgsType, Field } from "type-graphql";

@ArgsType()
export class CheckVersionInput {
  @Field(() => OperatingSystem)
  os: OperatingSystem = OperatingSystem.ANDROID;

  @Field(() => String)
  version: string = "";
}
