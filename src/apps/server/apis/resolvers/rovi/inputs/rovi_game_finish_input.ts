import { Field, InputType } from "type-graphql";

@InputType()
export class RoviGameFinishInput {
  @Field(() => String)
  token: string = "";

  @Field(() => Number)
  score: number = 0;

  @Field(() => Number)
  duration: number = 0;

  isValid(): boolean {
    if (this.token.length === 0) {
      return false;
    }
    if (this.score < 0) {
      return false;
    }
    if (this.duration <= 0) {
      return false;
    }
    return true;
  }
}
