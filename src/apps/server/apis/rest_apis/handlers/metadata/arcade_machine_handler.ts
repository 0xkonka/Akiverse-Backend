import { Service } from "typedi";
import { Metadata } from "../../../../../../models/metadata";
import { Context } from "../../../../../../context";
import { AbstractMetadataHandler } from "./abstract_metadata_handler";

@Service()
export class ArcadeMachineMetadataHandler extends AbstractMetadataHandler {
  async getMetadata(ctx: Context, id: string): Promise<Metadata> {
    return await this.useCase.getArcadeMachineMetadata(ctx, id);
  }
}
