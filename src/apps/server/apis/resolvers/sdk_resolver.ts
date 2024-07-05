import { Context } from "../../../../context";
import { Arg, Authorized, Ctx, Info, Mutation, Resolver } from "type-graphql";
import { Inject, Service } from "typedi";
import {
  FinishPlaySessionInput,
  FinishPlayInput,
  InProgressInput,
  StartPlaySessionInput,
  StartPlayInput,
} from "./inputs/sdk";
import {
  FinishPlaySessionOutput,
  FinishPlayOutput,
  InProgressOutput,
  StartPlaySessionOutput,
  StartPlayOutput,
} from "./outputs/sdk";
import { PlayGameUseCase } from "../../../../use_cases/play_game_usecase";
import { InvalidArgumentResolverError, toResolverError } from "./errors";
import { GraphQLResolveInfo } from "graphql";

@Service()
@Resolver()
export default class SdkResolver {
  constructor(
    @Inject("playGame.useCase") private readonly useCase: PlayGameUseCase,
  ) {}

  @Authorized()
  @Mutation(() => StartPlaySessionOutput)
  public async startPlaySession(
    @Arg("input") input: StartPlaySessionInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    if (!input.arcadeMachineId) {
      throw new InvalidArgumentResolverError("arcade machine id required");
    }
    try {
      return await this.useCase.startPlaySession(ctx, input.arcadeMachineId);
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }

  @Mutation(() => FinishPlaySessionOutput)
  public async finishPlaySession(
    @Arg("input") input: FinishPlaySessionInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    try {
      hasPlaySessionToken(input);
      const ret = await this.useCase.finishPlaySession(
        ctx,
        input.playSessionToken,
      );
      return { session: ret };
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }

  @Mutation(() => StartPlayOutput)
  public async startPlay(
    @Arg("input") input: StartPlayInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    try {
      hasPlaySessionToken(input);
      await this.useCase.startPlay(ctx, input.playSessionToken);
      return { success: true };
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }

  @Mutation(() => InProgressOutput)
  public async inProgress(
    @Arg("input") input: InProgressInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    try {
      hasPlaySessionToken(input);
      await this.useCase.inProgress(
        ctx,
        input.playSessionToken,
        input.score,
        input.timeStamp,
        input.salt,
        input.signature,
      );
    } catch (e) {
      // inProgressはエラー検知しないため
      ctx.log.warn(e);
    }
    return { success: true };
  }

  @Mutation(() => FinishPlayOutput)
  public async finishPlay(
    @Arg("input") input: FinishPlayInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    try {
      hasPlaySessionToken(input);
      await this.useCase.finishPlay(
        ctx,
        input.playSessionToken,
        input.score,
        input.timeStamp,
        input.salt,
        input.signature,
      );
      return { success: true };
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }
}

type HasPlaySessionToken = { playSessionToken: string };

function hasPlaySessionToken(v: HasPlaySessionToken): void {
  if (v.playSessionToken.length === 0) {
    throw new InvalidArgumentResolverError("play session token not found");
  }
}
