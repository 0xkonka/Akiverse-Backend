import { Field, InputType } from "type-graphql";

@InputType()
export class UpdateArcadeMachineInput {
  @Field(() => String)
  arcadeMachineId: string = "";

  @Field(() => Boolean)
  autoRenewLease: boolean = false;
}
