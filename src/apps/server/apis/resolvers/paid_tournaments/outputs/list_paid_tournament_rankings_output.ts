import { ListRankingsOutput } from "../../rankings/outputs/list_rankings_output";
import { Field, ObjectType, registerEnumType } from "type-graphql";
import { Rankings } from "../../../../../../helpers/ranking";
import { DecimalJSScalar } from "@generated/type-graphql/scalars";
import { Prisma } from "@prisma/client";

@ObjectType()
export class OwnedPrize {
  constructor(prizeInfo: {
    claimType: PrizeClaimType;
    teras: Prisma.Decimal;
    localCurrency?: number;
    crypt?: number;
  }) {
    this.claimType = prizeInfo.claimType;
    this.teras = prizeInfo.teras;
    this.localCurrency = prizeInfo.localCurrency;
    this.crypt = prizeInfo.crypt;
  }
  @Field(() => PrizeClaimType)
  claimType: PrizeClaimType;

  @Field(() => DecimalJSScalar)
  teras: Prisma.Decimal;

  @Field(() => Number, { nullable: true })
  localCurrency?: number;

  @Field(() => Number, { nullable: true })
  crypt?: number;
}

export enum PrizeClaimType {
  PHONE_NUMBER = "PHONE_NUMBER",
  WALLET_ADDRESS = "WALLET_ADDRESS",
}

registerEnumType(PrizeClaimType, {
  name: "PrizeClaimType",
  description: "Prize claim type",
});

@ObjectType()
export class ListPaidTournamentRankingsOutput extends ListRankingsOutput {
  constructor(
    rankings: Rankings,
    prizeInfo?: {
      claimType: PrizeClaimType;
      teras: Prisma.Decimal;
      localCurrency?: number;
      crypt?: number;
    },
  ) {
    super(rankings);
    if (prizeInfo) {
      this.ownedPrize = new OwnedPrize(prizeInfo);
    }
  }

  @Field(() => OwnedPrize, { nullable: true })
  ownedPrize?: OwnedPrize;
}
