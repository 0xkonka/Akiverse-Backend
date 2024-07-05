import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class CheckVersionOutput {
  constructor(debug: boolean) {
    this.debug = debug;
  }
  @Field(() => Boolean)
  debug: boolean;
}
