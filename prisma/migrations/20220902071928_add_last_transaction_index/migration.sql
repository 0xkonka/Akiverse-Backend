/*
  Warnings:

  - Added the required column `last_transaction_index` to the `league_of_kingdoms_item` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "league_of_kingdoms_item" ADD COLUMN     "last_transaction_index" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "league_of_kingdoms_item" ALTER COLUMN   "last_transaction_index" DROP DEFAULT;
