-- CreateEnum
CREATE TYPE "prize_send_status" AS ENUM ('UNPROCESSED', 'PENDING', 'CONFIRMED', 'ERROR');

-- AlterTable
ALTER TABLE "paid_tournament_entries" ADD COLUMN     "prize_send_status" "prize_send_status";

-- CreateTable
CREATE TABLE "spn_pay_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_tournament_entry_id" UUID NOT NULL,
    "submit_detail" TEXT NOT NULL,

    CONSTRAINT "spn_pay_results_pkey" PRIMARY KEY ("id")
);
