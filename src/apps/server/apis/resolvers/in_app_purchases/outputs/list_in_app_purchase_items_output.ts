import { Field, ObjectType } from "type-graphql";

type Param = {
  productId: string;
  title: string;
  imageUrl: string;
  bonus?: number;
  isSale: boolean;
  saleTitle?: string;
  offerText?: string;
};

@ObjectType()
export class ListInAppPurchaseItemsOutput {
  constructor({
    productId,
    title,
    imageUrl,
    bonus,
    isSale,
    saleTitle,
    offerText,
  }: Param) {
    this.productId = productId;
    this.title = title;
    this.imageUrl = imageUrl;
    this.bonus = bonus;
    this.isSale = isSale;
    this.saleTitle = saleTitle;
    this.offerText = offerText;
  }
  @Field(() => String)
  productId: string;
  @Field(() => String)
  title: string;
  @Field(() => String)
  imageUrl: string;
  @Field(() => Number, { nullable: true })
  bonus?: number;
  @Field(() => Boolean)
  isSale: boolean;
  @Field(() => String, { nullable: true })
  saleTitle?: string;
  @Field(() => String, { nullable: true })
  offerText?: string;
}
