-- AlterEnum
ALTER TYPE "PlayResult" RENAME TO "play_result";
ALTER TYPE "PlaySessionState" RENAME TO "play_session_state";

-- CreateEnum
CREATE TYPE "collect_state" AS ENUM ('UNPROCESSED', 'COLLECTED', 'UNINSTALLED');

-- CreateEnum
CREATE TYPE "payment_state" AS ENUM ('UNPROCESSED', 'PAID');

-- CreateTable
CREATE TABLE "rental_fees" (
    "date" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arcade_machine_owner_id" UUID NOT NULL,
    "arcade_machine_id" TEXT NOT NULL,
    "game_center_owner_id" UUID NOT NULL,
    "game_center_id" TEXT NOT NULL,
    "fee" DECIMAL(78,0) NOT NULL,
    "collect_state" "collect_state" NOT NULL DEFAULT 'UNPROCESSED',
    "collect_date" TIMESTAMP(3),
    "payment_state" "payment_state" NOT NULL DEFAULT 'UNPROCESSED',
    "payment_date" TIMESTAMP(3),

    CONSTRAINT "rental_fees_pkey" PRIMARY KEY ("date","arcade_machine_id")
);

-- CreateIndex
CREATE INDEX "rental_fees_date_arcade_machine_id_arcade_machine_owner_id_idx" ON "rental_fees"("date", "arcade_machine_id", "arcade_machine_owner_id");

-- CreateIndex
CREATE INDEX "rental_fees_date_game_center_owner_id_game_center_id_idx" ON "rental_fees"("date", "game_center_owner_id", "game_center_id");
