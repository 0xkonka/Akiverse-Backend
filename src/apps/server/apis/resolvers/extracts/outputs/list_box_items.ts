import "reflect-metadata";

import { Field, ObjectType } from "type-graphql";
import { ArcadePartCategory } from "@prisma/client";

export type ListBoxItemsInput = {
  category: ArcadePartCategory;
  subCategory: string;
  amount: number;
  initialAmount: number;
  name: string;
};
@ObjectType()
export class ListBoxItemsOutput {
  constructor(
    featuredItems: ListBoxItemsInput[],
    otherItems: ListBoxItemsInput[],
    totalAmount: number,
  ) {
    this.totalAmount = totalAmount;
    this.hotItems = featuredItems.map((v) => {
      return new BoxItem(v);
    });
    this.otherItems = otherItems.map((v) => {
      return new BoxItem(v);
    });
  }

  @Field(() => [BoxItem])
  hotItems: BoxItem[];

  @Field(() => [BoxItem])
  otherItems: BoxItem[];

  @Field(() => Number)
  totalAmount: number;
}

@ObjectType()
export class BoxItem {
  constructor(item: ListBoxItemsInput) {
    this.category = item.category;
    this.subCategory = item.subCategory;
    this.amount = item.amount;
    this.initialAmount = item.initialAmount;
    this.name = item.name;
  }
  @Field(() => String)
  category: ArcadePartCategory;

  @Field(() => String)
  subCategory: string;

  @Field(() => Number)
  amount: number;

  @Field(() => Number)
  initialAmount: number;

  @Field(() => String)
  name: string;
}
