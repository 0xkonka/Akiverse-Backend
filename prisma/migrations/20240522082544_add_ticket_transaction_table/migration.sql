-- CreateEnum
CREATE TYPE "ticket_transaction_type" AS ENUM ('PURCHASE', 'ENTER_TOURNAMENT', 'OPEN_QUEST');

-- CreateTable
CREATE TABLE "ticket_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "change_amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "transaction_type" "ticket_transaction_type" NOT NULL,
    "transaction_detail" TEXT,

    CONSTRAINT "ticket_transactions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ticket_transactions" ADD CONSTRAINT "ticket_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
