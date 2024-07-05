import { Service } from "typedi";
import { AbstractMetadataHandler } from "./abstract_metadata_handler";
import { Context } from "../../../../../../context";
import { Metadata } from "../../../../../../models/metadata";
import { getGameCenterId } from "../../../../../../helpers/game_centers";
import { Request } from "express";

@Service()
export class GameCenterMetadataHandler extends AbstractMetadataHandler {
  getIdFromRequest(req: Request): string {
    const { size, index } = req.params;
    return getGameCenterId(Number(size), Number(index));
  }

  async getMetadata(ctx: Context, id: string): Promise<Metadata> {
    return await this.useCase.getGameCenterMetadata(ctx, id);
  }
}
