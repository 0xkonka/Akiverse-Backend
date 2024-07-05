import { RankingId } from "../../../../../../use_cases/ranking_usecase";
import { ArgsType, Field } from "type-graphql";

@ArgsType()
export class ListRankingsInput {
  @Field(() => String)
  rankingId?: RankingId;
}
