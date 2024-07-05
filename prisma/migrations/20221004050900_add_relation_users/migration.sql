-- AlterTable
ALTER TABLE "arcade_machines" ADD COLUMN     "user_id" UUID;

-- AlterTable
ALTER TABLE "arcade_parts" ADD COLUMN     "user_id" UUID;

-- AlterTable
ALTER TABLE "game_centers" ADD COLUMN     "user_id" UUID;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "wallet_address" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "arcade_machines" ADD CONSTRAINT "arcade_machines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arcade_parts" ADD CONSTRAINT "arcade_parts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_centers" ADD CONSTRAINT "game_centers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
