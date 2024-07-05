import { MetadataUseCase } from "../../../../../../use_cases/metadata_usecase";
import getContext, { Context } from "../../../../../../context";
import { Metadata, MetadataAttribute } from "../../../../../../models/metadata";
import { bind } from "bind-decorator";
import { Request, Response } from "express";

// See. https://docs.opensea.io/docs/metadata-standards
type OutputMetadata = {
  name?: string;
  description: string;
  image: string;
  animation_url: string;
  external_url: string;
  attributes: MetadataAttribute[];
};

export abstract class AbstractMetadataHandler {
  constructor(readonly useCase: MetadataUseCase) {}

  abstract getMetadata(ctx: Context, id: string): Promise<Metadata>;

  getIdFromRequest(req: Request): string {
    return req.params.id;
  }

  @bind
  async get(req: Request, res: Response) {
    const ctx = getContext(req)!;
    const id = this.getIdFromRequest(req);
    const metadata = await this.getMetadata(ctx, id);
    // Akiverse内でのみ利用する項目はRestAPIでは返さない
    const resObj: OutputMetadata = {
      name: metadata.name,
      description: metadata.description,
      image: metadata.image,
      animation_url: metadata.animation_url,
      external_url: metadata.external_url,
      attributes: metadata.attributes,
    };
    res.json(resObj);
  }
}
