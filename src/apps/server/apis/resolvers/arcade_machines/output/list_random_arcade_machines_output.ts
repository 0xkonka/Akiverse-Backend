import { Field, ObjectType } from "type-graphql";
import { ArcadeMachine } from "@generated/type-graphql";

@ObjectType()
export class ListRandomArcadeMachinesOutput {
  constructor(_arcadeMachines: ArcadeMachine[]) {
    this.arcadeMachines = _arcadeMachines;
  }
  @Field(() => [ArcadeMachine])
  arcadeMachines: ArcadeMachine[];
}
