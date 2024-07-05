/*
  Warnings:

  - Changed the type of `size` on the `game_centers` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `wallet_address` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "arcade_machines" ADD COLUMN     "game_center_id" UUID,
ADD COLUMN     "position" INTEGER;

-- AlterTable
ALTER TABLE "game_centers" ADD COLUMN     "placement_allowed" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "size",
ADD COLUMN     "size" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "arcade_machines" ADD CONSTRAINT "arcade_machines_game_center_id_fkey" FOREIGN KEY ("game_center_id") REFERENCES "game_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
