/*
  Warnings:

  - You are about to drop the column `animation_url` on the `arcade_parts` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `arcade_parts` table. All the data in the column will be lost.
  - You are about to drop the column `external_url` on the `arcade_parts` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `arcade_parts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "arcade_parts" DROP COLUMN "animation_url",
DROP COLUMN "description",
DROP COLUMN "external_url",
DROP COLUMN "image";
