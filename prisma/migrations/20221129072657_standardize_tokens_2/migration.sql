-- AlterTable
ALTER TABLE "league_of_kingdoms_item" ADD COLUMN     "state" "nft_state" NOT NULL DEFAULT 'IN_WALLET';
-- AlterTable

ALTER TABLE "arcade_machines" ADD COLUMN     "last_block" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_transaction_index" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "arcade_parts" ADD COLUMN     "last_block" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_transaction_index" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "game_centers" ADD COLUMN     "last_block" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_transaction_index" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "league_of_kingdoms_item" ADD COLUMN     "user_id" UUID;

-- AddForeignKey
ALTER TABLE "league_of_kingdoms_item" ADD CONSTRAINT "league_of_kingdoms_item_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
