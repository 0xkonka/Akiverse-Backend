-- CreateEnum
CREATE TYPE "extractable_item_type" AS ENUM ('ARCADE_PART', 'JUNK_PART');

-- AlterTable
ALTER TABLE "arcade_machines" ADD COLUMN     "extracted_energy" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "arcade_parts" ADD COLUMN     "used_junks" INTEGER;

-- AlterTable
ALTER TABLE "plays" ADD COLUMN     "mega_spark" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "junks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "category" "arcade_part_category" NOT NULL,
    "sub_category" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "junks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extract_junk_inventories" (
    "category" TEXT NOT NULL,
    "sub_category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "extract_junk_inventories_pkey" PRIMARY KEY ("category","sub_category")
);

-- CreateTable
CREATE TABLE "extract_initial_inventories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "season_id" TEXT NOT NULL,
    "item_type" "extractable_item_type" NOT NULL,
    "category" TEXT NOT NULL,
    "sub_category" TEXT NOT NULL,
    "initial_amount" INTEGER NOT NULL,
    "featured_item" BOOLEAN NOT NULL,

    CONSTRAINT "extract_initial_inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3),
    "base_extract_item_count" INTEGER NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "arcade_machine_id" TEXT NOT NULL,
    "extract_arcade_parts_count" INTEGER NOT NULL,
    "extract_junk_parts_count" INTEGER NOT NULL,
    "extract_detail" JSONB NOT NULL,

    CONSTRAINT "extracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "junks_user_id_category_sub_category_key" ON "junks"("user_id", "category", "sub_category");

-- CreateIndex
CREATE UNIQUE INDEX "extract_initial_inventories_season_id_item_type_category_su_key" ON "extract_initial_inventories"("season_id", "item_type", "category", "sub_category");

-- AddForeignKey
ALTER TABLE "junks" ADD CONSTRAINT "junks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracts" ADD CONSTRAINT "extracts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracts" ADD CONSTRAINT "extracts_arcade_machine_id_fkey" FOREIGN KEY ("arcade_machine_id") REFERENCES "arcade_machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "junks"
    ADD CONSTRAINT junks_amount_over_zero CHECK ( amount >= 0);

-- AlterTable
ALTER TABLE "extract_junk_inventories"
    ADD CONSTRAINT extract_junk_inventories_amount_over_zero CHECK ( amount >= 0);