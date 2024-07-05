import { Field, InputType } from "type-graphql";

@InputType()
export class StartRecruitArcadeMachineInput {
  @Field(() => String)
  id?: string;
}
