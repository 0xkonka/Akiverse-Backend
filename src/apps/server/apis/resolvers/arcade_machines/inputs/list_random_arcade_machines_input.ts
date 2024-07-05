import { ArgsType, Field } from "type-graphql";

@ArgsType()
export class ListRandomArcadeMachinesInput {
  // 最大の返す総数
  @Field(() => Number, { nullable: true })
  requestCount: number = 30;

  // 含まれるゲームプレイ中のAM数
  @Field(() => Number, { nullable: true })
  maxPlayingCount: number = 10;

  @Field(() => String)
  game: string = "";
}
