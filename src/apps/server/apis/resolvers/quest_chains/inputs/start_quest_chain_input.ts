import { Field, InputType, registerEnumType } from "type-graphql";

@InputType()
export class StartQuestChainInput {
  @Field(() => String)
  questMasterId: string = "";

  @Field(() => StartQuestChainCurrencyType, { nullable: true })
  usedCurrency: StartQuestChainCurrencyType = StartQuestChainCurrencyType.TERAS;
}

enum StartQuestChainCurrencyType {
  TERAS = "TERAS",
  AKV = "AKV",
  TICKET = "TICKET",
}

registerEnumType(StartQuestChainCurrencyType, {
  name: "StartQuestChainCurrencyType",
  description: "Currency used for start quest chain",
});
