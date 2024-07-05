/*
  Warnings:

  - Added the required column `category` to the `arcade_parts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "arcade_part_category" AS ENUM ('ROM', 'ACCUMULATOR', 'UPPER_CABINET', 'LOWER_CABINET', 'JUNK');

-- AlterTable
ALTER TABLE "arcade_parts" ADD COLUMN     "category" "arcade_part_category" NOT NULL;
