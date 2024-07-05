import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class ListNFTsOutput {
  constructor(item: { name: string; tokenId: string }) {
    this.name = item.name;
    this.tokenId = item.tokenId;
  }

  @Field(() => String)
  name: string;

  @Field(() => String)
  tokenId: string;
}
