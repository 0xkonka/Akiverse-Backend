import { Field, InputType } from "type-graphql";

@InputType()
export class RoviGameStartInput {
  @Field(() => String)
  data: string = "";
}
