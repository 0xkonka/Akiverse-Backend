import { Field, ObjectType } from "type-graphql";
import { User } from "@generated/type-graphql";

@ObjectType()
export class CreateUserOutput {
  constructor(user: User, accessToken: string, refreshToken: string) {
    this.user = user;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }
  @Field()
  user: User;

  /** @deprecated Firebaseログイン実装後削除します*/
  @Field({ deprecationReason: "firebase認証に変更後削除" })
  accessToken: string;

  /** @deprecated Firebaseログイン実装後削除します*/
  @Field({ deprecationReason: "firebase認証に変更後削除" })
  refreshToken: string;
}
