import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class ExtractInfoOutput {
  constructor(count: number, extractCode?: number) {
    this.count = count;
    this.extractCode = extractCode;
  }

  @Field(() => Number)
  count: number;

  @Field(() => Number, { nullable: true })
  extractCode?: number;
}
