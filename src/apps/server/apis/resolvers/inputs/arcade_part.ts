import { Field, InputType } from "type-graphql";

@InputType()
export class WithdrawArcadePartInput {
  @Field(() => [String])
  ids?: string[];
}

@InputType()
export class DepositArcadePartInput {
  @Field(() => [String])
  ids?: string[];
  @Field(() => String)
  hash?: string;
}
