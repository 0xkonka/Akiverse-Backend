// https://docs.moralis.io/reference/requestchallengeevm
import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class RequestWeb3ChallengeOutput {
  @Field()
  message: string = "";

  @Field()
  sessionToken: string = "";
}
