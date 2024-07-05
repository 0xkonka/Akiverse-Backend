import { Field, InputType } from "type-graphql";

@InputType()
export class StopRecruitArcadeMachineInput {
  @Field(() => String)
  id?: string;
}
