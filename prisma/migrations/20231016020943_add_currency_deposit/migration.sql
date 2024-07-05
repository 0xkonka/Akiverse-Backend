-- CreateTable
CREATE TABLE "currency_deposits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency_type" "currency_type" NOT NULL,
    "amount" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "user_id" UUID NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "deposit_state" "deposit_state" NOT NULL DEFAULT 'UNPROCESSED',
    "hash" TEXT NOT NULL,

    CONSTRAINT "currency_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "currency_deposits_user_id_idx" ON "currency_deposits"("user_id");

-- CreateIndex
CREATE INDEX "currency_deposits_hash_wallet_address_idx" ON "currency_deposits"("hash", "wallet_address");

-- AddForeignKey
ALTER TABLE "currency_deposits" ADD CONSTRAINT "currency_deposits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
