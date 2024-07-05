import { InputType, Field } from "type-graphql";

@InputType()
export class DepositGameCenterInput {
  @Field(() => [String])
  ids?: string[];
  @Field(() => String)
  hash?: string;
}
