import { Field, InputType } from "type-graphql";

@InputType()
export class EnterTournamentInput {
  @Field(() => String)
  tournamentId: string = "";
}
