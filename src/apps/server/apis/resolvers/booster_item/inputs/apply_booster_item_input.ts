import { Field, InputType } from "type-graphql";

@InputType()
export class ApplyBoosterItemInput {
  @Field(() => String)
  boosterItemId?: string;

  @Field(() => String, { nullable: true })
  paidTournamentId?: string;
}
