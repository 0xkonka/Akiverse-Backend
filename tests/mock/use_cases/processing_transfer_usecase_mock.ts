import {
  ProcessingTransfers,
  ProcessingTransferUseCase,
} from "../../../src/use_cases/processing_transfer_usecase";
import { Context } from "vm";

export class ProcessingTransferUseCaseMock
  implements ProcessingTransferUseCase
{
  returnValueForList: ProcessingTransfers | null = null;
  throwErrorForList: any | null = null;

  reset() {
    this.returnValueForList = null;
    this.throwErrorForList = null;
  }
  async list(ctx: Context): Promise<ProcessingTransfers> {
    if (this.throwErrorForList) throw this.throwErrorForList;
    if (!this.returnValueForList) throw new Error("setup error");
    return this.returnValueForList;
  }
}
