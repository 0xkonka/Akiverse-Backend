import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class TokenRefreshOutput {
  constructor(
    /** @deprecated Firebaseログイン実装後削除します*/
    accessToken: string,
    firebaseAccessToken: string,
  ) {
    this.accessToken = accessToken;
    this.firebaseCustomToken = firebaseAccessToken;
  }

  @Field({ deprecationReason: "Firebase実装後削除" })
  accessToken: string;

  @Field()
  firebaseCustomToken: string;
}
