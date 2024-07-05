import { Field, ObjectType } from "type-graphql";
import { User } from "@generated/type-graphql";

@ObjectType()
export class RegisterWalletAddressOutput {
  constructor(user: User | null) {
    this.user = user;
  }

  @Field(() => User)
  user: User | null = null;
}
