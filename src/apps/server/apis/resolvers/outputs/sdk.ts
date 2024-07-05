import { PlaySession } from "@generated/type-graphql";
import { Field, ObjectType } from "type-graphql";
import { WinCondition } from "../../../../../metadata/games";

@ObjectType()
export class StartPlaySessionOutput {
  @Field(() => String)
  playSessionToken: string = "";

  @Field(() => PlaySession)
  session?: PlaySession;

  @Field(() => String)
  winCondition?: WinCondition;
}

@ObjectType()
export class FinishPlaySessionOutput {
  @Field(() => PlaySession)
  session?: PlaySession;
}

@ObjectType()
export class StartPlayOutput {
  @Field(() => Boolean)
  success: boolean = true;
}

@ObjectType()
export class InProgressOutput {
  @Field(() => Boolean)
  success: boolean = true;
}

@ObjectType()
export class FinishPlayOutput {
  @Field(() => Boolean)
  success: boolean = true;
}
