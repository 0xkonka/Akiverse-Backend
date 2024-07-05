/*
  Warnings:

  - You are about to drop the column `arcade_machine_owner_fee_akir_amount` on the `plays` table. All the data in the column will be lost.
  - You are about to drop the column `earned_akir_amount` on the `plays` table. All the data in the column will be lost.
  - You are about to drop the column `play_end_at` on the `plays` table. All the data in the column will be lost.
  - You are about to drop the column `play_start_at` on the `plays` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "plays" RENAME COLUMN "arcade_machine_owner_fee_akir_amount" to "arcade_machine_owner_fee_akir";
ALTER TABLE "plays" RENAME COLUMN "earned_akir_amount" to "earned_akir";
ALTER TABLE "plays" RENAME COLUMN "play_end_at" to "ended_at";
ALTER TABLE "plays" RENAME COLUMN "play_start_at" to "started_at";
ALTER TABLE "plays" RENAME COLUMN "user_id" to "player_id";
ALTER TABLE "plays" ADD COLUMN "arcade_machine_owner_id" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "plays" ADD CONSTRAINT "plays_arcade_machine_owner_id_fkey" FOREIGN KEY ("arcade_machine_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rename foreign key
ALTER TABLE "plays" RENAME CONSTRAINT "plays_user_id_fkey" TO "plays_player_id_fkey";
