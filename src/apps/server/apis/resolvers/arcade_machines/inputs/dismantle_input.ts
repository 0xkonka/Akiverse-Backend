import { Field, InputType, registerEnumType } from "type-graphql";

@InputType()
export class DismantleInput {
  @Field(() => String)
  arcadeMachineId: string = "";

  @Field(() => DismantleCurrencyType, { nullable: true })
  usedCurrency: DismantleCurrencyType = DismantleCurrencyType.TERAS;
}

enum DismantleCurrencyType {
  TERAS = "TERAS",
  AKV = "AKV",
}

registerEnumType(DismantleCurrencyType, {
  name: "DismantleCurrencyType",
  description: "Currency used for dismantle",
});
