-- CreateTable
CREATE TABLE "transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "block_number" INTEGER NOT NULL,
    "block_hash" TEXT NOT NULL,
    "transaction_index" INTEGER NOT NULL,
    "transaction_hash" TEXT NOT NULL,
    "state" "block_state" NOT NULL DEFAULT 'PENDING',
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "token_id" BIGINT NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);
