import { ArgsType, Field } from "type-graphql";

@ArgsType()
export class ListGamesInput {
  @Field(() => String, { nullable: true })
  version: string = "";
}
