import { ArcadePart } from "@generated/type-graphql";
import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class WithdrawArcadePartOutput {
  constructor(arcadePart: ArcadePart) {
    this.arcadePart = arcadePart;
  }
  @Field(() => ArcadePart)
  arcadePart: ArcadePart | null = null;
}

@ObjectType()
export class DepositArcadePartOutput {
  constructor(arcadePart: ArcadePart) {
    this.arcadePart = arcadePart;
  }
  @Field(() => ArcadePart)
  arcadePart: ArcadePart | null = null;
}
