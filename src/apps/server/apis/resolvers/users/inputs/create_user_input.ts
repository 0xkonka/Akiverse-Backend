import { Field, InputType } from "type-graphql";

@InputType()
export class CreateUserInput {
  /** @deprecated Firebaseログイン実装後削除します */
  @Field({ description: "Magic didToken", nullable: true })
  didToken: string = "";

  @Field()
  name: string = "";

  // TODO Firebaseログインのみになったらnon nullに変更する
  @Field({ description: "Firebase IDToken", nullable: true })
  idToken: string = "";
}
