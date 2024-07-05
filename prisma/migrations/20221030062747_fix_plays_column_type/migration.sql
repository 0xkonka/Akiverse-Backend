-- DropForeignKey
ALTER TABLE "plays" DROP CONSTRAINT "plays_game_center_id_fkey";

-- DropForeignKey
ALTER TABLE "plays" DROP CONSTRAINT "plays_game_center_owner_id_fkey";

-- AlterTable
ALTER TABLE "plays" ALTER COLUMN "game_center_id" DROP NOT NULL,
ALTER COLUMN "game_center_owner_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "plays" ADD CONSTRAINT "plays_game_center_id_fkey" FOREIGN KEY ("game_center_id") REFERENCES "game_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plays" ADD CONSTRAINT "plays_game_center_owner_id_fkey" FOREIGN KEY ("game_center_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
