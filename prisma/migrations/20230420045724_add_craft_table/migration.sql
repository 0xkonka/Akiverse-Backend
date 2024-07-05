
-- DropForeignKey
ALTER TABLE "arcade_parts" DROP CONSTRAINT "arcade_parts_crafted_arcade_machine_id_fkey";

-- AlterTable
ALTER TABLE "arcade_machines" ADD COLUMN     "accumulator_sub_category" TEXT;

-- update accumulator_sub_category
UPDATE "arcade_machines"
SET accumulator_sub_category = 'HOKUTO_100_LX'; -- 現時点で本番で配布しているACCはHOKUTO_100_LXのみ

ALTER TABLE "arcade_machines" ALTER COLUMN "accumulator_sub_category" SET NOT NULL;

-- CreateTable
CREATE TABLE "craft" (
                         "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                         "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         "user_id" UUID NOT NULL,
                         "crafted_arcade_machine_id" TEXT NOT NULL,
                         "used_teras_balance" DECIMAL(78,0) NOT NULL,

                         CONSTRAINT "craft_pkey" PRIMARY KEY ("id")
);

-- すでにCraftされている分のレコードを作り出す
INSERT INTO "craft" ( "user_id", "crafted_arcade_machine_id", "used_teras_balance")
SELECT ap.user_id,ap.crafted_arcade_machine_id,0 FROM arcade_parts ap
WHERE ap.category = 'ROM'
  AND destroyed_at IS NOT NULL;


-- AlterTable
ALTER TABLE "arcade_parts" ADD COLUMN "craft_id" UUID;

-- craftテーブルから書き戻す
UPDATE "arcade_parts"
    SET "craft_id" = (SELECT id FROM craft WHERE crafted_arcade_machine_id = arcade_parts.crafted_arcade_machine_id);

-- AlterTable
ALTER TABLE "arcade_parts" DROP COLUMN "crafted_arcade_machine_id";


-- AddForeignKey
ALTER TABLE "arcade_parts" ADD CONSTRAINT "arcade_parts_craft_id_fkey" FOREIGN KEY ("craft_id") REFERENCES "craft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "craft" ADD CONSTRAINT "craft_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "craft" ADD CONSTRAINT "craft_crafted_arcade_machine_id_fkey" FOREIGN KEY ("crafted_arcade_machine_id") REFERENCES "arcade_machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "craft_crafted_arcade_machine_id_key" ON "craft"("crafted_arcade_machine_id");