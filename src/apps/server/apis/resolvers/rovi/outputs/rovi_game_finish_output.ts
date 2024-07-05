import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class RoviGameFinishOutput {
  constructor(success: boolean) {
    this.success = success;
  }
  @Field(() => Boolean)
  success: boolean;
}
