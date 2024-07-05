import { ArgsType, Field } from "type-graphql";

@ArgsType()
export class ListPaidTournamentRankingsInput {
  @Field(() => String)
  tournamentId?: string;
}
