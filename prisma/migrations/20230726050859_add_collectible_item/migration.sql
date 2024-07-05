-- CreateEnum
CREATE TYPE "icon_type" AS ENUM ('IN_WORLD', 'NFT');

-- CreateEnum
CREATE TYPE "collectible_item_category" AS ENUM ('ICON');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "frame_sub_category" TEXT NOT NULL DEFAULT 'DEFAULT',
ADD COLUMN     "icon_sub_category" TEXT NOT NULL DEFAULT 'DEFAULT',
ADD COLUMN     "icon_type" "icon_type" NOT NULL DEFAULT 'IN_WORLD';

-- CreateTable
CREATE TABLE "collectible_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "category" "collectible_item_category" NOT NULL,
    "sub_category" TEXT NOT NULL,

    CONSTRAINT "collectible_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collectible_items_user_id_idx" ON "collectible_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "collectible_items_user_id_category_sub_category_key" ON "collectible_items"("user_id", "category", "sub_category");

-- AddForeignKey
ALTER TABLE "collectible_items" ADD CONSTRAINT "collectible_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
