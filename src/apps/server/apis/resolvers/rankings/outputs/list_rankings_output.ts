import { Field, ObjectType } from "type-graphql";
import { IconType } from "@prisma/client";
import { Rankings } from "../../../../../../helpers/ranking";

@ObjectType()
export class ListRankingsOutput {
  constructor(rankings: Rankings) {
    this.topList = rankings.topList.map((v) => new RankingItem(v));
    if (rankings.myself) {
      this.myself = new RankingItem(rankings.myself);
    }
  }

  @Field(() => [RankingItem])
  topList: RankingItem[];

  @Field(() => RankingItem, { nullable: true })
  myself: RankingItem | null = null;
}

@ObjectType()
export class RankingItem {
  constructor(item: RankingItem) {
    this.rank = item.rank;
    this.score = item.score;
    this.userId = item.userId;
    this.name = item.name;
    this.iconType = item.iconType;
    this.iconSubCategory = item.iconSubCategory;
    this.titleSubCategory = item.titleSubCategory;
    this.frameSubCategory = item.frameSubCategory;
  }
  @Field(() => Number)
  rank: number;

  @Field(() => Number)
  score: number;

  @Field(() => String)
  userId: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  iconType: IconType;

  @Field(() => String)
  iconSubCategory: string;

  @Field(() => String)
  titleSubCategory: string;

  @Field(() => String)
  frameSubCategory: string;
}
