import { Field, InputType } from "type-graphql";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "@generated/type-graphql/scalars";

@InputType()
export class DepositAKVInput {
  @Field(() => String)
  transactionHash: string = "";

  @Field(() => DecimalJSScalar)
  amount?: Prisma.Decimal;
}
