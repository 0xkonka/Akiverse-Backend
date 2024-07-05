import { InputType, Field } from "type-graphql";

// https://docs.moralis.io/reference/verifychallengeevm
@InputType()
export class RegisterWalletAddressInput {
  @Field()
  message: string = "";

  @Field()
  signature: string = "";
}
