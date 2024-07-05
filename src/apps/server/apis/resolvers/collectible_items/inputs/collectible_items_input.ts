import { ArgsType, Field, InputType } from "type-graphql";
import {
  DateTimeFilter,
  EnumCollectibleItemCategoryFilter,
  StringNullableFilter,
  CollectibleItemOrderByWithRelationInput,
} from "@generated/type-graphql";

@InputType()
export class CollectibleItemsWhereInput {
  @Field(() => DateTimeFilter, { nullable: true })
  createdAt?: DateTimeFilter | undefined;

  @Field(() => EnumCollectibleItemCategoryFilter, { nullable: true })
  category?: EnumCollectibleItemCategoryFilter | undefined;

  @Field(() => StringNullableFilter, { nullable: true })
  subCategory?: StringNullableFilter | undefined;
}

@ArgsType()
export class CollectibleItemsArgs {
  @Field(() => CollectibleItemsWhereInput, { nullable: true })
  where?: CollectibleItemsWhereInput;

  @Field(() => CollectibleItemOrderByWithRelationInput, { nullable: true })
  orderBy?: CollectibleItemOrderByWithRelationInput[] | undefined;

  @Field(() => String, { nullable: true, description: "cursor is required id" })
  cursor?: string | undefined;

  @Field(() => Number, { nullable: true })
  take?: number | undefined;

  @Field(() => Number, { nullable: true })
  skip?: number | undefined;
}
