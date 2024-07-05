import { ArgsType, Field } from "type-graphql";

@ArgsType()
export class ListPlacementArcadeMachinesInput {
  @Field(() => String)
  id?: string;
}
