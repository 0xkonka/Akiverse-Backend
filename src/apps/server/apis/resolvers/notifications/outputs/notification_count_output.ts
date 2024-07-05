import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class NotificationCountOutput {
  constructor(items: number) {
    this.count = items;
  }
  @Field()
  count: number;
}
