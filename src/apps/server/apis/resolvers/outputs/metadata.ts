import { Field, Int, ObjectType } from "type-graphql";
import {
  Metadata as MetadataType,
  MetadataAttribute as MetadataAttributeType,
} from "../../../../../models/metadata";

@ObjectType()
export class Metadata {
  constructor(m: MetadataType) {
    this.name = m.name;
    this.description = m.description;
    this.image = m.image;
    this.transparentImageUrl = m.transparent_image_url;
    this.withoutAccImageUrl = m.without_acc_image_url;
    this.animationUrl = m.animation_url;
    this.externalUrl = m.animation_url;
    this.attributes = convert(m.attributes);
    this.rarity = m.rarity;
  }
  @Field(() => String)
  name?: string;

  @Field(() => String)
  description?: string;

  @Field(() => String)
  image: string = "";

  @Field(() => String, { nullable: true })
  transparentImageUrl?: string = "";

  @Field(() => String, { nullable: true })
  withoutAccImageUrl?: string = "";

  @Field(() => String)
  animationUrl: string = "";

  @Field(() => String)
  externalUrl: string = "";

  @Field(() => [MetadataAttribute])
  attributes: MetadataAttribute[] = [];

  @Field(() => Int)
  rarity?: number;
}

function convert(attributes: MetadataAttributeType[]): MetadataAttribute[] {
  return attributes.map<MetadataAttribute>((value) => {
    return new MetadataAttribute(value);
  });
}

@ObjectType()
export class MetadataAttribute {
  constructor(attr: MetadataAttributeType) {
    this.traitType = attr.trait_type;
    this.value = attr.value;
    if ("display_type" in attr) {
      this.displayType = attr.display_type;
    } else {
      // カラム自体を消すのはGraphQLだとできないので、存在しない場合はString固定にする
      this.displayType = "string";
    }
  }
  @Field(() => String)
  traitType: string = "";

  @Field(() => String)
  displayType: string = "";

  @Field(() => String)
  value: string | number | bigint = "";
}
