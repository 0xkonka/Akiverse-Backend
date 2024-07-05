-- CreateEnum
CREATE TYPE "WithdrawalType" AS ENUM ('MINT', 'TRANSFER');

-- AlterTable
ALTER TABLE "arcade_machines" ADD COLUMN     "physical_wallet_address" TEXT;

-- AlterTable
ALTER TABLE "arcade_parts" ADD COLUMN     "physical_wallet_address" TEXT;

-- AlterTable
ALTER TABLE "game_centers" ADD COLUMN     "physical_wallet_address" TEXT;

-- AlterTable
ALTER TABLE "league_of_kingdoms_item" ADD COLUMN     "physical_wallet_address" TEXT;

-- AlterTable
ALTER TABLE "withdrawals" ADD COLUMN     "hash" TEXT,
ADD COLUMN     "type" "WithdrawalType";
