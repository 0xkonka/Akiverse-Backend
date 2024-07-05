/*
  Warnings:

  - You are about to drop the column `animation_url` on the `game_centers` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `game_centers` table. All the data in the column will be lost.
  - You are about to drop the column `external_url` on the `game_centers` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `game_centers` table. All the data in the column will be lost.
  - Changed the type of `area` on the `game_centers` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `size` on the `game_centers` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "game_center_size" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "game_center_area" AS ENUM ('AKIHABARA', 'SHIBUYA');

-- AlterTable
ALTER TABLE "game_centers" DROP COLUMN "animation_url",
DROP COLUMN "description",
DROP COLUMN "external_url",
DROP COLUMN "image",
DROP COLUMN "area",
ADD COLUMN     "area" "game_center_area" NOT NULL,
DROP COLUMN "size",
ADD COLUMN     "size" "game_center_size" NOT NULL;
