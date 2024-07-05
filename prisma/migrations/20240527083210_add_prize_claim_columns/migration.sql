-- AlterTable
ALTER TABLE "paid_tournament_entries" ADD COLUMN     "phone_number" TEXT,
ADD COLUMN     "prize_claimed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wallet_address" TEXT;
