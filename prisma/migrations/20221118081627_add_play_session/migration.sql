/*
  Warnings:

  - You are about to drop the column `arcade_machine_id` on the `plays` table. All the data in the column will be lost.
  - You are about to drop the column `arcade_machine_owner_fee_akir` on the `plays` table. All the data in the column will be lost.
  - You are about to drop the column `arcade_machine_owner_fee_rate` on the `plays` table. All the data in the column will be lost.
  - You are about to drop the column `arcade_machine_owner_id` on the `plays` table. All the data in the column will be lost.
  - You are about to drop the column `earned_akir` on the `plays` table. All the data in the column will be lost.
  - You are about to drop the column `game_center_id` on the `plays` table. All the data in the column will be lost.
  - You are about to drop the column `game_center_owner_id` on the `plays` table. All the data in the column will be lost.
  - You are about to drop the column `player_id` on the `plays` table. All the data in the column will be lost.
  - You are about to drop the column `started_at` on the `plays` table. All the data in the column will be lost.
  - Added the required column `playSessionId` to the `plays` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PlaySessionState" AS ENUM ('READY', 'PLAYING', 'FINISHED');

-- CreateEnum
CREATE TYPE "PlayResult" AS ENUM ('WIN', 'LOSS', 'DISCONNECTED');

-- DropForeignKey
ALTER TABLE "plays" DROP CONSTRAINT "plays_arcade_machine_id_fkey";

-- DropForeignKey
ALTER TABLE "plays" DROP CONSTRAINT "plays_arcade_machine_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "plays" DROP CONSTRAINT "plays_game_center_id_fkey";

-- DropForeignKey
ALTER TABLE "plays" DROP CONSTRAINT "plays_game_center_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "plays" DROP CONSTRAINT "plays_player_id_fkey";

-- AlterTable
ALTER TABLE "plays" DROP COLUMN "arcade_machine_id",
DROP COLUMN "arcade_machine_owner_fee_akir",
DROP COLUMN "arcade_machine_owner_fee_rate",
DROP COLUMN "arcade_machine_owner_id",
DROP COLUMN "earned_akir",
DROP COLUMN "game_center_id",
DROP COLUMN "game_center_owner_id",
DROP COLUMN "player_id",
DROP COLUMN "started_at",
ADD COLUMN     "playSessionId" UUID NOT NULL,
ADD COLUMN     "result" "PlayResult",
ADD COLUMN     "score" INTEGER;

-- CreateTable
CREATE TABLE "play_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "player_id" UUID NOT NULL,
    "arcade_machine_id" BIGINT NOT NULL,
    "arcade_machine_owner_id" UUID NOT NULL,
    "game_center_id" BIGINT NOT NULL,
    "game_center_owner_id" UUID NOT NULL,
    "difficulty" INTEGER,
    "target_score" INTEGER,
    "max_retries" INTEGER NOT NULL,
    "auth_token" TEXT NOT NULL,
    "state" "PlaySessionState" NOT NULL,

    CONSTRAINT "play_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "game" TEXT NOT NULL,
    "daily_max_retries" INTEGER NOT NULL,
    "difficulty" INTEGER,
    "target_score" INTEGER,

    CONSTRAINT "game_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_settings_game_key" ON "game_settings"("game");

-- AddForeignKey
ALTER TABLE "plays" ADD CONSTRAINT "plays_playSessionId_fkey" FOREIGN KEY ("playSessionId") REFERENCES "play_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_arcade_machine_id_fkey" FOREIGN KEY ("arcade_machine_id") REFERENCES "arcade_machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_arcade_machine_owner_id_fkey" FOREIGN KEY ("arcade_machine_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_game_center_id_fkey" FOREIGN KEY ("game_center_id") REFERENCES "game_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_game_center_owner_id_fkey" FOREIGN KEY ("game_center_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
