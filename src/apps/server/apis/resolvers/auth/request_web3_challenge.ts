import "reflect-metadata";

import { Inject, Service } from "typedi";
import { WalletAddressUseCase } from "../../../../../use_cases/wallet_address_usecase";
import { Arg, Ctx, Info, Mutation, Resolver } from "type-graphql";
import { RequestWeb3ChallengeOutput } from "./outputs/request_web3_challenge_output";
import { RequestWeb3ChallengeInput } from "./inputs/request_web3_challenge_input";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import addDays from "add-days";
import Moralis from "moralis";
import {
  AKIVERSE_DOMAIN,
  MORALIS_SESSION_PREFIX,
  WORLD_MANAGER_URI,
} from "../../../../../constants";
import {
  hashSessionToken,
  randomSessionToken,
} from "../../../../../helpers/auth";

@Service()
@Resolver()
export default class RequestWeb3ChallengeResolver {
  constructor(
    @Inject("walletAddress.useCase")
    private readonly walletAddressUseCase: WalletAddressUseCase,
  ) {}

  @Mutation(() => RequestWeb3ChallengeOutput)
  public async RequestWeb3Challenge(
    @Arg("input") input: RequestWeb3ChallengeInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ): Promise<RequestWeb3ChallengeOutput> {
    ctx = ctx.getChildContext(info);
    // Calculate expiration time
    const now = new Date();
    const expiresAt = addDays(now, 60);

    // Ask moralis to create challenge
    const { walletAddress, chain } = input;
    const response = await Moralis.Auth.requestMessage({
      // Provided by user
      address: walletAddress,
      chain,
      networkType: "evm",
      // Provided by akiverse
      domain: AKIVERSE_DOMAIN,
      statement: "Please sign this message to confirm your identity.",
      uri: WORLD_MANAGER_URI,
      expirationTime: expiresAt.toISOString(),
      timeout: 15,
    });
    const { id, message, profileId } = response.raw;

    // Create session token
    const sessionToken = randomSessionToken(MORALIS_SESSION_PREFIX);
    const tokenHash = hashSessionToken(sessionToken);

    // Save session token
    await ctx.prisma.moralisSession.create({
      data: {
        // provided by moralis
        challengeId: id,
        message,
        profileId,
        // generated in backend
        tokenHash,
        expiresAt,
        // provided by user
        walletAddress,
        network: "evm",
        chain,
      },
    });
    return { sessionToken, message };
  }
}
