import {
  Resolver,
  Mutation,
  Arg,
  Ctx,
  Authorized,
  Root,
  FieldResolver,
  Info,
} from "type-graphql";
import { ArcadeMachine } from "@generated/type-graphql";

import { Context } from "../../../../context";
import {
  DepositArcadeMachineInput,
  InstallArcadeMachineInput,
  UninstallArcadeMachineInput,
  WithdrawArcadeMachineInput,
} from "./inputs/arcade_machine";
import ArcadeMachineUseCase from "../../../../use_cases/arcade_machine_usecase";
import { InvalidArgumentResolverError, toResolverError } from "./errors";

import {
  InstallArcadeMachineOutput,
  UninstallArcadeMachineOutput,
} from "./outputs/arcade_machine";
import { Inject, Service } from "typedi";
import { Metadata } from "./outputs/metadata";
import { MetadataUseCase } from "../../../../use_cases/metadata_usecase";
import { GraphQLResolveInfo } from "graphql";
import { DecimalJSScalar } from "@generated/type-graphql/scalars";
import { Prisma } from "@prisma/client";
import { calculateEmitReward } from "../../../../helpers/fee";
import { isMegaSparkUpcoming } from "../../../../helpers/mega_spark";
import { MEGA_SPARKED_REWARD } from "../../../../constants";

@Service()
@Resolver(() => ArcadeMachine)
export default class ArcadeMachineOperationResolver {
  constructor(
    @Inject("arcadeMachine.useCase")
    private readonly useCase: ArcadeMachineUseCase,
    @Inject("metadata.useCase")
    private readonly metadataUseCase: MetadataUseCase,
  ) {}

  @Authorized()
  @Mutation(() => InstallArcadeMachineOutput)
  public async installArcadeMachine(
    @Arg("input") input: InstallArcadeMachineInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    if (
      !(
        input.arcadeMachineId &&
        input.gameCenterId &&
        input.autoRenewLease !== undefined
      )
    ) {
      ctx.log.error({ input: input }, "invalid parameter");
      throw new InvalidArgumentResolverError("invalid parameter");
    }
    try {
      const arcadeMachine = await this.useCase.installArcadeMachineToGameCenter(
        ctx,
        input.arcadeMachineId,
        input.gameCenterId,
        input.autoRenewLease,
      );
      return new InstallArcadeMachineOutput(arcadeMachine);
    } catch (e) {
      ctx.log.error(e, "handled error");
      throw toResolverError(ctx, e);
    }
  }

  @Authorized()
  @Mutation(() => UninstallArcadeMachineOutput)
  public async uninstallArcadeMachine(
    @Arg("input") input: UninstallArcadeMachineInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    if (!input.id) {
      throw new InvalidArgumentResolverError("id required");
    }
    try {
      const arcadeMachine =
        await this.useCase.uninstallArcadeMachineFromGameCenter(ctx, input.id);
      return new UninstallArcadeMachineOutput(arcadeMachine);
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }

  @Authorized()
  @Mutation(() => [ArcadeMachine])
  public async withdrawArcadeMachine(
    @Arg("input") input: WithdrawArcadeMachineInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    if (!input.ids || input.ids.length === 0) {
      throw new InvalidArgumentResolverError("id required");
    }
    try {
      const arcadeMachine = await this.useCase.withdraw(ctx, ...input.ids);
      return arcadeMachine;
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }

  @FieldResolver(() => Metadata)
  async metadata(
    @Root() arcadeMachine: ArcadeMachine,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Ctx() ctx: Context,
  ): Promise<Metadata> {
    const ret = await this.metadataUseCase.getArcadeMachineMetadata(
      ctx,
      arcadeMachine.id,
    );
    return new Metadata(ret);
  }

  @Authorized()
  @Mutation(() => [ArcadeMachine])
  public async depositArcadeMachine(
    @Arg("input") input: DepositArcadeMachineInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    if (!input.ids || input.ids.length === 0) {
      throw new InvalidArgumentResolverError("id required");
    }
    if (!input.hash) {
      throw new InvalidArgumentResolverError("hash required");
    }
    try {
      return await this.useCase.deposit(ctx, input.hash, ...input.ids);
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }

  @FieldResolver(() => Boolean)
  async playing(
    @Root() arcadeMachine: ArcadeMachine,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ): Promise<boolean> {
    ctx = ctx.getChildContext(info);
    try {
      return await this.useCase.playing(ctx, arcadeMachine.id);
    } catch (e) {
      ctx.log.error(e);
      // エラー時もAMとしては正常に取得できているのでPlay中として返す
      return true;
    }
  }

  @Authorized()
  @FieldResolver(() => DecimalJSScalar)
  rewardForSparking(
    @Root() arcadeMachine: ArcadeMachine,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ): Prisma.Decimal {
    ctx = ctx.getChildContext(info);

    // 次にSparkしたらMegaSparkなのでそちらを返す
    if (isMegaSparkUpcoming(arcadeMachine.energy, arcadeMachine.maxEnergy)) {
      return MEGA_SPARKED_REWARD;
    }
    // ctx.currentUserOwnsに直接GraphQLレイヤーのArcadeMachine型を渡せないため比較ロジック書いている
    const isSelfArcadeMachine = ctx.userId! === arcadeMachine.userId;
    const fever =
      arcadeMachine.feverSparkRemain !== null &&
      arcadeMachine.feverSparkRemain !== undefined &&
      arcadeMachine.feverSparkRemain > 0;
    const calculated = calculateEmitReward(
      isSelfArcadeMachine,
      arcadeMachine.game,
      fever,
    );
    // 表示するのはプレイヤーとして獲得できるTerasを表示する
    return calculated.emitPlayerReward;
  }

  @Authorized()
  @FieldResolver(() => Boolean)
  megaSparkUpcoming(
    @Root() arcadeMachine: ArcadeMachine,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ): Boolean {
    ctx = ctx.getChildContext(info);

    const energy = arcadeMachine.energy;
    const maxEnergy = arcadeMachine.maxEnergy;
    return isMegaSparkUpcoming(energy, maxEnergy);
  }
}
