import { Arg, Authorized, Ctx, Info, Mutation, Resolver } from "type-graphql";
import Moralis from "moralis";
import { RegisterWalletAddressOutput } from "./outputs/register_wallet_address_output";
import { Context } from "../../../../../context";
import { toResolverError } from "../errors";
import { Inject, Service } from "typedi";
import { GraphQLResolveInfo } from "graphql";
import { WalletAddressUseCase } from "../../../../../use_cases/wallet_address_usecase";
import { RegisterWalletAddressInput } from "./inputs/register_wallet_address_input";

Moralis.start({
  apiKey: process.env.MORALIS_API_KEY,
});

@Service()
@Resolver()
export default class RegisterWalletAddressResolver {
  constructor(
    @Inject("walletAddress.useCase")
    private readonly walletAddressUseCase: WalletAddressUseCase,
  ) {}

  // メアドログインしているユーザーに対して設定するため、ここだけ@Authorizedが必要
  // メルアドログイン後にVerifyWeb3Challengeを呼び、MetaMaskの操作後にこのメソッドを呼び出す
  @Authorized()
  @Mutation(() => RegisterWalletAddressOutput)
  public async registerWalletAddress(
    @Arg("input") input: RegisterWalletAddressInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    // Verify with moralis
    const { message, signature } = input;

    try {
      const user = await this.walletAddressUseCase.register(
        ctx,
        message,
        signature,
      );

      return new RegisterWalletAddressOutput(user);
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }
}
