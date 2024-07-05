import { Field, ObjectType } from "type-graphql";
import { ArcadePart } from "@generated/type-graphql";

@ObjectType()
export class SwapJunkToArcadePartsOutput {
  constructor(items: ArcadePart[]) {
    this.arcadeParts = items;
  }
  @Field(() => [ArcadePart])
  arcadeParts: ArcadePart[];
}
