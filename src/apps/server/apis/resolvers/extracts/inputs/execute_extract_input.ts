import { Field, InputType, registerEnumType } from "type-graphql";

@InputType()
export class ExecuteExtractInput {
  @Field(() => String)
  arcadeMachineId: string = "";

  @Field(() => Number)
  extractCode: number = 0;

  @Field(() => ExtractCurrencyType, { nullable: true })
  usedCurrency: ExtractCurrencyType = ExtractCurrencyType.TERAS;
}

enum ExtractCurrencyType {
  TERAS = "TERAS",
  AKV = "AKV",
}

registerEnumType(ExtractCurrencyType, {
  name: "ExtractCurrencyType",
  description: "Currency used for extracting",
});
