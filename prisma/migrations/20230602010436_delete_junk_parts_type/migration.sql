/*
  Warnings:

  - The values [JUNK] on the enum `arcade_part_category` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "arcade_part_category_new" AS ENUM ('ROM', 'ACCUMULATOR', 'UPPER_CABINET', 'LOWER_CABINET');
ALTER TABLE "arcade_parts" ALTER COLUMN "category" TYPE "arcade_part_category_new" USING ("category"::text::"arcade_part_category_new");
ALTER TABLE "junks" ALTER COLUMN "category" TYPE "arcade_part_category_new" USING ("category"::text::"arcade_part_category_new");
ALTER TYPE "arcade_part_category" RENAME TO "arcade_part_category_old";
ALTER TYPE "arcade_part_category_new" RENAME TO "arcade_part_category";
DROP TYPE "arcade_part_category_old";
COMMIT;
