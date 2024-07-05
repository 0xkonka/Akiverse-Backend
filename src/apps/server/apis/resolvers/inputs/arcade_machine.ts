import { InputType, Field } from "type-graphql";

@InputType()
export class InstallArcadeMachineInput {
  @Field(() => String)
  arcadeMachineId?: string;

  @Field(() => String)
  gameCenterId?: string;

  @Field(() => Boolean)
  autoRenewLease?: boolean;
}

@InputType()
export class UninstallArcadeMachineInput {
  @Field(() => String)
  id?: string;
}

@InputType()
export class WithdrawArcadeMachineInput {
  @Field(() => [String])
  ids?: string[];
}

@InputType()
export class DepositArcadeMachineInput {
  @Field(() => [String])
  ids?: string[];

  @Field(() => String)
  hash?: string;
}
