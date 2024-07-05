-- CreateEnum
CREATE TYPE "currency_type" AS ENUM ('AKIR', 'AKV');

-- CreateTable
CREATE TABLE "currency_withdrawals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency_type" "currency_type" NOT NULL,
    "amount" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "user_id" UUID,
    "wallet_address" TEXT NOT NULL COLLATE case_insensitive,
    "withdrawal_state" "withdrawal_state" NOT NULL DEFAULT 'UNPROCESSED',
    "type" "WithdrawalType",
    "hash" TEXT,
    "nonce" INTEGER,
    "response" TEXT,
    "signer_address" TEXT,
    "error_message" TEXT,

    CONSTRAINT "currency_withdrawals_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "currency_withdrawals" ADD CONSTRAINT "currency_withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
