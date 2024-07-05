import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class RobiGameStartOutput {
  constructor(playToken: string) {
    this.playToken = playToken;
  }
  @Field(() => String)
  playToken: string;
}
