import { ArgsType, Field } from "type-graphql";

@ArgsType()
export class TokenRefreshInput {
  @Field()
  refreshToken: string = "";

  // 移行用 FEにFirebase認証が実装されていて移行可能な場合にtrueを設定してカスタムトークンを要求する
  @Field(() => Boolean, { nullable: true })
  requestNewAuth: boolean = false;
}
