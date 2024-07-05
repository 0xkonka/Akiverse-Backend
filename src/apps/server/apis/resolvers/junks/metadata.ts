import { Inject, Service } from "typedi";
import { MetadataUseCase } from "../../../../../use_cases/metadata_usecase";
import { FieldResolver, Resolver, Root } from "type-graphql";
import { Junk } from "@generated/type-graphql";
import { JunkMetadata } from "./outputs/metadata";
import {
  getArcadePartMetadata,
  getJunkMetadata,
} from "../../../../../metadata/arcade-parts";
import { InternalServerResolverError } from "../errors";

@Service()
@Resolver(() => Junk)
export default class JunkMetadataFieldResolver {
  constructor(
    @Inject("metadata.useCase")
    private readonly metadataUseCase: MetadataUseCase,
  ) {}

  @FieldResolver(() => JunkMetadata)
  metadata(@Root() junk: Junk): JunkMetadata {
    try {
      const { name, junksPerPart, imageUrl, rarity } = getJunkMetadata(
        junk.category,
        junk.subCategory,
      );
      const arcadePartMetadata = getArcadePartMetadata(
        junk.category,
        junk.subCategory,
      );
      return new JunkMetadata(
        name,
        junksPerPart,
        imageUrl,
        rarity,
        arcadePartMetadata,
      );
    } catch (e: unknown) {
      throw new InternalServerResolverError("unknown subCategory");
    }
  }
}
