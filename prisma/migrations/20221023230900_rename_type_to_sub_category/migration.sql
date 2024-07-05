/*
  Warnings:

  - You are about to drop the column `type` on the `arcade_parts` table. All the data in the column will be lost.
  - Added the required column `subCategory` to the `arcade_parts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "arcade_parts" DROP COLUMN "type",
ADD COLUMN     "sub_category" TEXT NOT NULL;
