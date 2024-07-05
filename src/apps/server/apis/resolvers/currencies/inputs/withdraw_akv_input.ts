import { Field, InputType } from "type-graphql";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "@generated/type-graphql/scalars";

@InputType()
export class WithdrawAKVInput {
  @Field(() => DecimalJSScalar)
  amount?: Prisma.Decimal;
}
