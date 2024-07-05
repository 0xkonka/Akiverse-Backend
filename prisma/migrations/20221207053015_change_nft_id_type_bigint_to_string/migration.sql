/*
  Warnings:

  - The primary key for the `arcade_machines` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `arcade_parts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `game_centers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `league_of_kingdoms_item` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "arcade_machines" DROP CONSTRAINT "arcade_machines_game_center_id_fkey";

-- DropForeignKey
ALTER TABLE "play_sessions" DROP CONSTRAINT "play_sessions_arcade_machine_id_fkey";

-- DropForeignKey
ALTER TABLE "play_sessions" DROP CONSTRAINT "play_sessions_game_center_id_fkey";

-- AlterTable
ALTER TABLE "arcade_machines" DROP CONSTRAINT "arcade_machines_pkey",
ALTER COLUMN "id" SET DEFAULT ((((floor((random() * (1048576)::double precision)))::bigint + ((floor((random() * (1048576)::double precision)))::bigint << 20)) + ((floor((random() * (8388608)::double precision)))::bigint << 40)))::text,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "game_center_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "arcade_machines_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "arcade_parts" DROP CONSTRAINT "arcade_parts_pkey",
ALTER COLUMN "id" SET DEFAULT ((((floor((random() * (1048576)::double precision)))::bigint + ((floor((random() * (1048576)::double precision)))::bigint << 20)) + ((floor((random() * (8388608)::double precision)))::bigint << 40)))::text,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "arcade_parts_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "game_centers" DROP CONSTRAINT "game_centers_pkey",
ALTER COLUMN "id" SET DEFAULT ((((floor((random() * (1048576)::double precision)))::bigint + ((floor((random() * (1048576)::double precision)))::bigint << 20)) + ((floor((random() * (8388608)::double precision)))::bigint << 40)))::text,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "game_centers_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "league_of_kingdoms_item" DROP CONSTRAINT "league_of_kingdoms_item_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "league_of_kingdoms_item_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "play_sessions" ALTER COLUMN "arcade_machine_id" SET DATA TYPE TEXT,
ALTER COLUMN "game_center_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "transfers" ALTER COLUMN "token_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "withdrawals" ALTER COLUMN "token_id" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "arcade_machines" ADD CONSTRAINT "arcade_machines_game_center_id_fkey" FOREIGN KEY ("game_center_id") REFERENCES "game_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_arcade_machine_id_fkey" FOREIGN KEY ("arcade_machine_id") REFERENCES "arcade_machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_game_center_id_fkey" FOREIGN KEY ("game_center_id") REFERENCES "game_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
