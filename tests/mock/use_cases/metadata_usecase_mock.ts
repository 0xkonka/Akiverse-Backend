import {
  GameWithRecipe,
  MetadataUseCase,
} from "../../../src/use_cases/metadata_usecase";
import { Metadata } from "../../../src/models/metadata";
import { Context } from "../../../src/context";

function getDefault(): Metadata {
  return {
    name: "dummy_name",
    image: "dummy_image",
    description: "dummy_description",
    animation_url: "dummy_animation",
    external_url: "dummy_external",
    attributes: [
      {
        trait_type: "Type",
        value: "dummy_value_string",
      },
      {
        trait_type: "X Coordinates",
        display_type: "number",
        value: 1,
      },
    ],
  };
}
export class MetadataUseCaseMock implements MetadataUseCase {
  returnGameCenterValue: Metadata | null = null;
  returnArcadePartValue: Metadata | null = null;
  returnArcadeMachineValue: Metadata | null = null;
  throwGameCenterError: any | null = null;
  throwArcadePartError: any | null = null;
  throwArcadeMachineError: any | null = null;

  reset() {
    this.returnGameCenterValue = null;
    this.returnArcadePartValue = null;
    this.returnArcadeMachineValue = null;
    this.throwGameCenterError = null;
    this.throwArcadePartError = null;
    this.throwArcadeMachineError = null;
  }

  setDefault() {
    this.returnGameCenterValue = getDefault();
    this.returnArcadeMachineValue = getDefault();
    this.returnArcadePartValue = getDefault();
  }

  async getGameCenterMetadata(ctx: Context, id: string): Promise<Metadata> {
    if (this.throwGameCenterError) throw this.throwGameCenterError;
    if (!this.returnGameCenterValue) throw new Error("Setup error");
    return this.returnGameCenterValue;
  }

  async getArcadePartMetadata(ctx: Context, id: string): Promise<Metadata> {
    if (this.throwArcadePartError) throw this.throwArcadePartError;
    if (!this.returnArcadePartValue) throw new Error("Setup error");
    return this.returnArcadePartValue;
  }

  async getArcadeMachineMetadata(ctx: Context, id: string): Promise<Metadata> {
    if (this.throwArcadeMachineError) throw this.throwArcadeMachineError;
    if (!this.returnArcadeMachineValue) throw new Error("Setup error");
    return this.returnArcadeMachineValue;
  }

  getGames(): GameWithRecipe[] {
    return [];
  }
}
