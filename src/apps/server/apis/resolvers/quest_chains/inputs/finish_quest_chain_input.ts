import { Field, InputType } from "type-graphql";

@InputType()
export class FinishQuestChainInput {
  @Field(() => String)
  questMasterId: string = "";
}
