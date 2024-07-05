import { Service } from "typedi";
import { Metadata } from "../../../../../../models/metadata";
import { Context } from "../../../../../../context";
import { AbstractMetadataHandler } from "./abstract_metadata_handler";

@Service()
export class ArcadePartMetadataHandler extends AbstractMetadataHandler {
  async getMetadata(ctx: Context, id: string): Promise<Metadata> {
    return await this.useCase.getArcadePartMetadata(ctx, id);
  }
}
