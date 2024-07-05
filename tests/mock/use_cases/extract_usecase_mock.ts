import {
  BoxItem,
  ExtractCurrencyType,
  ExtractUseCase,
  MinNumberOfExtractItemsResponse,
} from "../../../src/use_cases/extract_usecase";
import { Context } from "../../../src/context";
import { ArcadePart, Junk } from "@prisma/client";

export class ExtractUseCaseMock implements ExtractUseCase {
  returnValueForMinNumberOfExtractItems: MinNumberOfExtractItemsResponse | null =
    null;
  throwErrorForMinNumberOfExtractItems: any = null;

  returnValueForListBoxItems: BoxItem[] | null = null;
  throwErrorForListBoxItems: any = null;

  returnValueForExtract: (ArcadePart | Junk)[] | null = null;
  throwErrorForExtract: any = null;

  reset(): void {
    this.returnValueForMinNumberOfExtractItems = null;
    this.throwErrorForMinNumberOfExtractItems = null;

    this.returnValueForListBoxItems = null;
    this.throwErrorForListBoxItems = null;

    this.returnValueForExtract = null;
    this.throwErrorForExtract = null;
  }
  async minNumberOfExtractItems(
    ctx: Context,
    accumulatorSubCategory: string,
    energy: number,
    extractedEnergy: number,
  ): Promise<MinNumberOfExtractItemsResponse> {
    if (this.throwErrorForMinNumberOfExtractItems)
      throw this.throwErrorForMinNumberOfExtractItems;
    if (!this.returnValueForMinNumberOfExtractItems) throw Error("setup error");
    return this.returnValueForMinNumberOfExtractItems;
  }

  async listBoxItems(ctx: Context): Promise<BoxItem[]> {
    if (this.throwErrorForListBoxItems) throw this.throwErrorForListBoxItems;
    if (!this.returnValueForListBoxItems) throw Error("setup error");
    return this.returnValueForListBoxItems;
  }

  async extract(
    ctx: Context,
    arcadeMachineId: string,
    extractCode: number,
    currencyType: ExtractCurrencyType,
  ): Promise<(ArcadePart | Junk)[]> {
    if (this.throwErrorForExtract) throw this.throwErrorForExtract;
    if (!this.returnValueForExtract) throw Error("setup error");
    return this.returnValueForExtract;
  }
}
