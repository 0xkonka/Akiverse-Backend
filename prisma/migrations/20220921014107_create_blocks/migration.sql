-- CreateEnum
CREATE TYPE "block_state" AS ENUM ('CONFIRMED', 'PENDING', 'INVALIDATED');

-- CreateTable
CREATE TABLE "blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "number" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "parent_hash" TEXT NOT NULL,
    "state" "block_state" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blocks_hash_key" ON "blocks"("hash");
