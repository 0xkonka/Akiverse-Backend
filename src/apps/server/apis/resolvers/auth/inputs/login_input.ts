import { ArgsType, Field } from "type-graphql";

@ArgsType()
export class LoginInput {
  // メアドログイン用
  @Field({ nullable: true })
  didToken: string = "";

  // WalletLogin用
  @Field({ nullable: true })
  message: string = "";

  // WalletLogin用
  @Field({ nullable: true })
  signature: string = "";

  isValid(): boolean {
    // メアドログインの情報のみ もしくは WalletLogin用の情報のみが設定されていればTrue
    const isEmailLogin = this.didToken !== "";
    let isWalletLogin = false;
    if (this.message !== "" && this.signature !== "") {
      isWalletLogin = true;
    }
    // 両方設定されているのはおかしい
    if (isEmailLogin && isWalletLogin) {
      return false;
    }
    // 両方設定されていないのもおかしい
    if (!isEmailLogin && !isWalletLogin) {
      return false;
    }
    return true;
  }
}
