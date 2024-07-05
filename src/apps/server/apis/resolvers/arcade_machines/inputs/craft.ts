import "reflect-metadata";

import { Field, InputType, registerEnumType } from "type-graphql";

@InputType()
export class CraftPartInput {
  @Field(() => String, { nullable: true })
  tokenId?: string;

  @Field(() => String, { nullable: true })
  subCategory?: string;

  isValid(): boolean {
    // 両方設定されている
    if (this.tokenId && this.subCategory) {
      return false;
    }
    // 両方設定されていない
    if (!this.tokenId && !this.subCategory) {
      return false;
    }
    return true;
  }
}

@InputType()
export class CraftInput {
  @Field()
  rom?: CraftPartInput;

  @Field()
  accumulator?: CraftPartInput;

  @Field()
  lowerCabinet?: CraftPartInput;

  @Field()
  upperCabinet?: CraftPartInput;

  @Field(() => CraftCurrencyType, { nullable: true })
  usedCurrency: CraftCurrencyType = CraftCurrencyType.TERAS;

  isValid(): boolean {
    return !!(
      this.rom?.isValid() &&
      this.accumulator?.isValid() &&
      this.lowerCabinet?.isValid() &&
      this.upperCabinet?.isValid()
    );
  }
}

enum CraftCurrencyType {
  TERAS = "TERAS",
  AKV = "AKV",
}

registerEnumType(CraftCurrencyType, {
  name: "CraftCurrencyType",
  description: "Currency used for crafting",
});
