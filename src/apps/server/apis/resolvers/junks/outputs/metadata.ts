import { Field, Int, ObjectType } from "type-graphql";
import { Metadata } from "../../outputs/metadata";
import { Metadata as MetadataType } from "../../../../../../models/metadata";

@ObjectType()
export class JunkMetadata {
  constructor(
    name: string,
    junksPerPart: number,
    imageUrl: string,
    rarity: number,
    arcadePartMetadata: MetadataType,
  ) {
    this.name = name;
    this.image = imageUrl;
    this.junksPerPart = junksPerPart;
    this.rarity = rarity;
    this.arcadePartMetadata = new Metadata(arcadePartMetadata);
  }
  @Field(() => String)
  name: string;

  @Field(() => String)
  image: string;

  @Field(() => Int)
  junksPerPart: number;

  @Field(() => Int)
  rarity: number;

  @Field(() => Metadata)
  arcadePartMetadata: Metadata;
}
