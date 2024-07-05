-- CreateTable
CREATE TABLE "currency_transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "block_number" INTEGER NOT NULL,
    "block_hash" TEXT NOT NULL,
    "transaction_index" INTEGER NOT NULL,
    "transaction_hash" TEXT NOT NULL,
    "state" "block_state" NOT NULL DEFAULT 'PENDING',
    "currency_type" "currency_type" NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "amount" DECIMAL(78,0) NOT NULL DEFAULT 0,

    CONSTRAINT "currency_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "currency_transfers_block_hash_idx" ON "currency_transfers"("block_hash");

-- CreateIndex
CREATE INDEX "currency_transfers_state_idx" ON "currency_transfers"("state");

-- CreateIndex
CREATE UNIQUE INDEX "currency_transfers_block_hash_transaction_index_from_to_amo_key" ON "currency_transfers"("block_hash", "transaction_index", "from", "to", "amount");
