-- CreateEnum
CREATE TYPE "deposit_state" AS ENUM ('UNPROCESSED', 'PENDING', 'CONFIRMED', 'INVALIDATED');

-- CreateTable
CREATE TABLE "deposits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token_id" TEXT NOT NULL,
    "nft_type" "nft_type" NOT NULL,
    "user_id" UUID,
    "wallet_address" TEXT,
    "deposit_state" "deposit_state" NOT NULL DEFAULT 'UNPROCESSED',
    "hash" TEXT,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE deposits
    ALTER COLUMN wallet_address TYPE text COLLATE case_insensitive;