/*
  Warnings:

  - A unique constraint covering the columns `[auth_token]` on the table `play_sessions` will be added. If there are existing duplicate values, this will fail.
  - You are about to drop the column `daily_max_retries` on the `game_settings` table. All the data in the column will be lost.
  - Added the required column `daily_max_play_count` to the `game_settings` table without a default value. This is not possible if the table is not empty.
  - You are about to drop the column `max_retries` on the `play_sessions` table. All the data in the column will be lost.
  - Added the required column `max_play_count` to the `play_sessions` table without a default value. This is not possible if the table is not empty.
  - You are about to drop the column `playSessionId` on the `plays` table. All the data in the column will be lost.
  - Added the required column `play_session_id` to the `plays` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "play_sessions" DROP CONSTRAINT "play_sessions_game_center_id_fkey";

-- DropForeignKey
ALTER TABLE "play_sessions" DROP CONSTRAINT "play_sessions_game_center_owner_id_fkey";

-- AlterTable
ALTER TABLE "play_sessions" ALTER COLUMN "game_center_id" DROP NOT NULL,
ALTER COLUMN "game_center_owner_id" DROP NOT NULL;

    -- AlterTable
ALTER TABLE "play_sessions" DROP COLUMN "max_retries",
ADD COLUMN     "max_play_count" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "play_sessions_auth_token_key" ON "play_sessions"("auth_token");

-- AddForeignKey
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_game_center_id_fkey" FOREIGN KEY ("game_center_id") REFERENCES "game_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_game_center_owner_id_fkey" FOREIGN KEY ("game_center_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "plays" DROP CONSTRAINT "plays_playSessionId_fkey";

-- AlterTable
ALTER TABLE "plays" DROP COLUMN "playSessionId",
ADD COLUMN     "play_session_id" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "plays" ADD CONSTRAINT "plays_play_session_id_fkey" FOREIGN KEY ("play_session_id") REFERENCES "play_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX one_active_play_session_per_arcade_machine
    ON play_sessions (arcade_machine_id) WHERE (state <> 'FINISHED');

CREATE UNIQUE INDEX one_active_play_per_play_session
    ON plays (play_session_id) WHERE (result is null);

-- AlterTable
ALTER TABLE "game_settings" DROP COLUMN "daily_max_retries",
ADD COLUMN     "daily_max_play_count" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "play_sessions" ADD COLUMN     "ended_at" TIMESTAMP(3);

-- DropIndex
DROP INDEX "game_settings_game_key";

-- AlterTable
ALTER TABLE "game_settings" DROP CONSTRAINT "game_settings_pkey",
                            DROP COLUMN "id",
                            ADD CONSTRAINT "game_settings_pkey" PRIMARY KEY ("game");

CREATE UNIQUE INDEX one_active_play_session_per_user
    ON play_sessions (player_id) WHERE (STATE <> 'FINISHED');
