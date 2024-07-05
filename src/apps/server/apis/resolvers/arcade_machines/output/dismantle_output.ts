import { Field, ObjectType } from "type-graphql";
import { ArcadePart } from "@generated/type-graphql";

@ObjectType()
export class DismantleOutput {
  constructor(
    rom: ArcadePart,
    upperCabinet: ArcadePart,
    upperCabinetGradeUp: boolean,
    lowerCabinet: ArcadePart,
    lowerCabinetGradeUp: boolean,
  ) {
    this.rom = rom;
    this.upperCabinet = upperCabinet;
    this.upperCabinetGradeUp = upperCabinetGradeUp;
    this.lowerCabinet = lowerCabinet;
    this.lowerCabinetGradeUp = lowerCabinetGradeUp;
  }
  @Field(() => ArcadePart)
  rom: ArcadePart;

  @Field(() => ArcadePart)
  upperCabinet: ArcadePart;

  @Field(() => Boolean)
  upperCabinetGradeUp: boolean;

  @Field(() => ArcadePart)
  lowerCabinet: ArcadePart;

  @Field(() => Boolean)
  lowerCabinetGradeUp: boolean;
}
