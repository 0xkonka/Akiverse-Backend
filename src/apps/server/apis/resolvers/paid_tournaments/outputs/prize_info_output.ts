import { Prisma, RewardItemType } from "@prisma/client";
import { Field, ObjectType } from "type-graphql";
import { DecimalJSScalar } from "@generated/type-graphql/scalars";

export type RankPrize = {
  order: number;
  title: string;
  prizes: PrizeDetail[];
};

// 現状トーナメントの賞金にTeras以外が設定されることはないが、UIの仕様だとあり得ることになっているので定義だけしておく
export type PrizeDetail = {
  itemType: RewardItemType;
  name: string;
  category: string | null;
  subCategory: string | null;
  amount: number;
  percentage: number | null;
};

@ObjectType()
export class PrizeInfoOutput {
  constructor(
    totalPrizePoolTeras: Prisma.Decimal,
    winnerPrizeTeras: Prisma.Decimal,
    rank: RankPrize[],
  ) {
    this.totalPrizePoolTeras = totalPrizePoolTeras;
    this.winnerPrizeTeras = winnerPrizeTeras;
    this.prizeByRank = rank.map(
      (v) => new PrizeByRankOutput(v.order, v.title, v.prizes),
    );
  }

  @Field(() => DecimalJSScalar)
  totalPrizePoolTeras: Prisma.Decimal;

  @Field(() => DecimalJSScalar)
  winnerPrizeTeras: Prisma.Decimal;

  @Field(() => [PrizeByRankOutput])
  prizeByRank: PrizeByRankOutput[];
}

@ObjectType()
export class PrizeByRankOutput {
  constructor(order: number, title: string, prizes: PrizeDetail[]) {
    this.order = order;
    this.title = title;
    this.prizes = prizes.map((p) => new PrizeOutput(p));
  }
  @Field(() => Number)
  order: number = 0;

  @Field(() => String)
  title: string = "";

  @Field(() => [PrizeOutput])
  prizes: PrizeOutput[];
}

@ObjectType()
export class PrizeOutput {
  constructor(item: PrizeDetail) {
    this.itemType = item.itemType;
    this.category = item.category;
    this.subCategory = item.subCategory;
    this.name = item.name;
    this.amount = item.amount;
    this.percentage = item.percentage;
  }
  @Field(() => String)
  itemType: RewardItemType;

  @Field(() => String, { nullable: true })
  category: string | null;

  @Field(() => String, { nullable: true })
  subCategory: string | null;

  @Field(() => String)
  name: string;

  @Field(() => Number)
  amount: number;

  @Field(() => Number, { nullable: true })
  percentage: number | null;
}
