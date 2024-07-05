import { ObjectType, Field } from "type-graphql";
import { ArcadeMachine } from "@generated/type-graphql";

@ObjectType()
export class InstallArcadeMachineOutput {
  constructor(arcadeMachine: ArcadeMachine) {
    this.arcadeMachine = arcadeMachine;
  }

  @Field(() => ArcadeMachine)
  arcadeMachine: ArcadeMachine | null = null;
}

@ObjectType()
export class UninstallArcadeMachineOutput {
  constructor(arcadeMachine: ArcadeMachine) {
    this.arcadeMachine = arcadeMachine;
  }

  @Field(() => ArcadeMachine)
  arcadeMachine: ArcadeMachine | null = null;
}

@ObjectType()
export class WithdrawArcadeMachineOutput {
  constructor(arcadeMachine: ArcadeMachine) {
    this.arcadeMachine = arcadeMachine;
  }

  @Field(() => ArcadeMachine)
  arcadeMachine: ArcadeMachine | null = null;
}

@ObjectType()
export class DepositArcadeMachineOutput {
  constructor(arcadeMachine: ArcadeMachine) {
    this.arcadeMachine = arcadeMachine;
  }

  @Field(() => ArcadeMachine)
  arcadeMachine: ArcadeMachine | null = null;
}
