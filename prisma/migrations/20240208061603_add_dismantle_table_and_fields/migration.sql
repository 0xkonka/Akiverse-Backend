-- CreateEnum
CREATE TYPE "burn_state" AS ENUM ('UNPROCESSED', 'PENDING', 'CONFIRMED', 'ERROR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "nft_state" ADD VALUE 'BURNING';
ALTER TYPE "nft_state" ADD VALUE 'BURNED';

-- AlterTable
ALTER TABLE "arcade_machines" ADD COLUMN     "destroyed_at" TIMESTAMP(3),
ADD COLUMN     "lower_cabinet_sub_category" TEXT NOT NULL DEFAULT 'PLAIN',
ADD COLUMN     "upper_cabinet_sub_category" TEXT NOT NULL DEFAULT 'PLAIN';

-- AlterTable
ALTER TABLE "arcade_parts" ADD COLUMN     "create_dismantle_id" UUID;

-- CreateTable
CREATE TABLE "burns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token_id" TEXT NOT NULL,
    "nft_type" "nft_type" NOT NULL,
    "user_id" UUID,
    "burn_state" "burn_state" NOT NULL DEFAULT 'UNPROCESSED',
    "hash" TEXT,
    "nonce" INTEGER,
    "response" TEXT,
    "signer_address" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "burns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dismantles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "arcade_machine_id" TEXT NOT NULL,
    "fever_spark_remain" INTEGER NOT NULL,

    CONSTRAINT "dismantles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "burns_user_id_idx" ON "burns"("user_id");

-- CreateIndex
CREATE INDEX "dismantles_user_id_idx" ON "dismantles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "dismantles_arcade_machine_id_key" ON "dismantles"("arcade_machine_id");

-- AddForeignKey
ALTER TABLE "arcade_parts" ADD CONSTRAINT "arcade_parts_create_dismantle_id_fkey" FOREIGN KEY ("create_dismantle_id") REFERENCES "dismantles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "burns" ADD CONSTRAINT "burns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dismantles" ADD CONSTRAINT "dismantles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dismantles" ADD CONSTRAINT "dismantles_arcade_machine_id_fkey" FOREIGN KEY ("arcade_machine_id") REFERENCES "arcade_machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
