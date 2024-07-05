import { Field, InputType, Int } from "type-graphql";

@InputType()
export class StartPlaySessionInput {
  @Field(() => String)
  arcadeMachineId?: string;
}

@InputType()
export class FinishPlaySessionInput {
  @Field(() => String)
  playSessionToken: string = "";
}

@InputType()
export class StartPlayInput {
  @Field(() => String)
  playSessionToken: string = "";
}

@InputType()
export class InProgressInput {
  @Field(() => String)
  playSessionToken: string = "";

  @Field(() => Int)
  score?: number = 0;

  // TODO SDKが入れ替わったらnullable:falseに修正する
  @Field(() => Date, { nullable: true })
  timeStamp?: Date;

  // TODO SDKが入れ替わったらnullable:falseに修正する
  @Field(() => String, { nullable: true })
  salt?: string;

  // TODO SDKが入れ替わったらnullable:falseに修正する
  @Field(() => String, { nullable: true })
  signature?: string;
}

@InputType()
export class FinishPlayInput {
  @Field(() => String)
  playSessionToken: string = "";

  @Field(() => Int)
  score: number = 0;

  // TODO SDKが入れ替わったらnullable:falseに修正する
  @Field(() => Date, { nullable: true })
  timeStamp?: Date;

  // TODO SDKが入れ替わったらnullable:falseに修正する
  @Field(() => String, { nullable: true })
  salt?: string;

  // TODO SDKが入れ替わったらnullable:falseに修正する
  @Field(() => String, { nullable: true })
  signature?: string;
}
