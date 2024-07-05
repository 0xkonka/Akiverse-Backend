/*
  Warnings:

  - You are about to drop the column `name` on the `arcade_machines` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `arcade_parts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "arcade_machines" DROP COLUMN "name";

-- AlterTable
ALTER TABLE "arcade_parts" DROP COLUMN "name";
