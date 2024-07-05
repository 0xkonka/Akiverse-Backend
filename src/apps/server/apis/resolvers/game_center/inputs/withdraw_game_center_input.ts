import { Field, InputType } from "type-graphql";

@InputType()
export class WithdrawGameCenterInput {
  @Field(() => [String])
  ids?: string[];
}
