/*
  Warnings:

  - The values [LEAGUE_OF_KINGDOMS_ITEM] on the enum `nft_type` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `league_of_kingdoms_item` table. If the table is not empty, all the data it contains will be lost.

*/

-- unused record delete
DELETE FROM "transfers" WHERE nft_type = 'LEAGUE_OF_KINGDOMS_ITEM';

-- AlterEnum
BEGIN;
CREATE TYPE "nft_type_new" AS ENUM ('ARCADE_PART', 'ARCADE_MACHINE', 'GAME_CENTER');
ALTER TABLE "transfers" ALTER COLUMN "nft_type" DROP DEFAULT;
ALTER TABLE "withdrawals" ALTER COLUMN "nft_type" TYPE "nft_type_new" USING ("nft_type"::text::"nft_type_new");
ALTER TABLE "deposits" ALTER COLUMN "nft_type" TYPE "nft_type_new" USING ("nft_type"::text::"nft_type_new");
ALTER TABLE "transfers" ALTER COLUMN "nft_type" TYPE "nft_type_new" USING ("nft_type"::text::"nft_type_new");
ALTER TABLE "notifications" ALTER COLUMN "nft_type" TYPE "nft_type_new" USING ("nft_type"::text::"nft_type_new");
ALTER TYPE "nft_type" RENAME TO "nft_type_old";
ALTER TYPE "nft_type_new" RENAME TO "nft_type";
DROP TYPE "nft_type_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "league_of_kingdoms_item" DROP CONSTRAINT "league_of_kingdoms_item_user_id_fkey";

-- DropTable
DROP TABLE "league_of_kingdoms_item";
