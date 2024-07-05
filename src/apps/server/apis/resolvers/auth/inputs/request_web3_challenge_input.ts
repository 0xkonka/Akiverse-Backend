import { InputType, Field } from "type-graphql";

// https://docs.moralis.io/reference/requestchallengeevm
@InputType()
export class RequestWeb3ChallengeInput {
  @Field()
  walletAddress: string = "";

  @Field()
  chain: string = "0x89";
}
