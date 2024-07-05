import {
  ProcessingFtTransfer,
  ProcessingNftTransfer,
  ProcessingTransfers,
} from "../../../../../../use_cases/processing_transfer_usecase";
import { Field, ObjectType } from "type-graphql";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "@generated/type-graphql/scalars";

@ObjectType()
class CheckTransferNftItems {
  constructor(transfer: ProcessingNftTransfer) {
    this.deposits = transfer.deposits;
    this.withdraws = transfer.withdraws;
  }
  @Field(() => [CheckTransferNftItem])
  deposits: CheckTransferNftItem[];
  @Field(() => [CheckTransferNftItem])
  withdraws: CheckTransferNftItem[];
}

@ObjectType()
class CheckTransferNftOutput {
  constructor(
    gameCenters: ProcessingNftTransfer,
    arcadeMachines: ProcessingNftTransfer,
    arcadeParts: ProcessingNftTransfer,
  ) {
    this.gameCenters = new CheckTransferNftItems(gameCenters);
    this.arcadeMachines = new CheckTransferNftItems(arcadeMachines);
    this.arcadeParts = new CheckTransferNftItems(arcadeParts);
  }
  @Field(() => CheckTransferNftItems)
  gameCenters: CheckTransferNftItems;
  @Field(() => CheckTransferNftItems)
  arcadeMachines: CheckTransferNftItems;
  @Field(() => CheckTransferNftItems)
  arcadeParts: CheckTransferNftItems;
}

@ObjectType()
class CheckTransferFtItem {
  constructor(transfers: ProcessingFtTransfer) {
    this.deposits = transfers.deposits;
    this.withdraws = transfers.withdraws;
  }
  @Field(() => [DecimalJSScalar])
  deposits: Prisma.Decimal[];
  @Field(() => [DecimalJSScalar])
  withdraws: Prisma.Decimal[];
}

@ObjectType()
class CheckTransferFtOutput {
  constructor(akv: ProcessingFtTransfer, akir: ProcessingFtTransfer) {
    this.akv = new CheckTransferFtItem(akv);
    this.akir = new CheckTransferFtItem(akir);
  }
  @Field(() => CheckTransferFtItem)
  akv: CheckTransferFtItem;
  @Field(() => CheckTransferFtItem)
  akir: CheckTransferFtItem;
}

@ObjectType()
class CheckTransferNftItem {
  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }
  @Field(() => String)
  id: string;
  @Field(() => String)
  name: string;
}

@ObjectType()
export class CheckTransfersOutput {
  constructor(transfers: ProcessingTransfers) {
    this.nft = new CheckTransferNftOutput(
      transfers.nft.gameCenters,
      transfers.nft.arcadeMachines,
      transfers.nft.arcadeParts,
    );
    this.ft = new CheckTransferFtOutput(transfers.ft.akv, transfers.ft.akir);
  }

  @Field(() => CheckTransferNftOutput)
  nft: CheckTransferNftOutput;
  @Field(() => CheckTransferFtOutput)
  ft: CheckTransferFtOutput;
}
