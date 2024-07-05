import { Field, ObjectType } from "type-graphql";
import { User } from "@generated/type-graphql";

@ObjectType()
export class LoginOutput {
  constructor(
    user: User,
    /** @deprecated Firebaseログイン実装後に削除 */
    accessToken: string,
    /** @deprecated Firebaseログイン実装後に削除 */
    refreshToken: string,
    firebaseCustomToken: string,
  ) {
    this.user = user;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.firebaseCustomToken = firebaseCustomToken;
  }
  @Field()
  user: User;

  /** @deprecated Firebaseログイン実装後に削除 */
  @Field({ deprecationReason: "firebase実装後削除" })
  accessToken: string;

  /** @deprecated Firebaseログイン実装後に削除 */
  @Field({ deprecationReason: "firebase実装後削除" })
  refreshToken: string;

  @Field()
  firebaseCustomToken: string;
}
