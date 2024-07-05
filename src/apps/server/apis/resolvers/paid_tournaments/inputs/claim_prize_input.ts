import { Field, InputType } from "type-graphql";

@InputType()
export class ClaimPrizeInput {
  @Field(() => String)
  tournamentId: string = "";

  @Field(() => String, { nullable: true })
  walletAddress: string = "";

  @Field(() => String, { nullable: true })
  phoneNumber: string = "";
}
