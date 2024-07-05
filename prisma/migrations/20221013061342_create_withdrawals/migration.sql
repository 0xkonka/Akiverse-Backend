-- CreateEnum
CREATE TYPE "withdrawal_state" AS ENUM ('UNPROCESSED', 'PENDING', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "nft_type" AS ENUM ('ARCADE_PART', 'ARCADE_MACHINE', 'GAME_CENTER');

-- CreateEnum
CREATE TYPE "nft_state" AS ENUM ('DEPOSITED', 'WITHDRAWAL_PENDING', 'WITHDRAWN', 'DEPOSIT_PENDING');

-- AlterTable
ALTER TABLE "arcade_machines" ADD COLUMN     "state" "nft_state" NOT NULL DEFAULT 'DEPOSITED';

-- AlterTable
ALTER TABLE "arcade_parts" ADD COLUMN     "state" "nft_state" NOT NULL DEFAULT 'DEPOSITED';

-- AlterTable
ALTER TABLE "game_centers" ADD COLUMN     "state" "nft_state" NOT NULL DEFAULT 'DEPOSITED';

-- Add checks
ALTER TABLE "arcade_machines"
    ADD CONSTRAINT can_only_place_deposited_arcade_machines
        CHECK (game_center_id is null and "position" is null or state = 'DEPOSITED');

ALTER TABLE "game_centers"
    ADD CONSTRAINT can_only_place_in_deposited_game_centers
        CHECK (placement_allowed = false or state = 'DEPOSITED');

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token_id" BIGINT NOT NULL,
    "nft_type" "nft_type" NOT NULL,
    "user_id" UUID NOT NULL,
    "wallet_address" TEXT,
    "withdrawal_state" "withdrawal_state" NOT NULL DEFAULT 'UNPROCESSED',

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
