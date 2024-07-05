/*
  Warnings:

  - You are about to alter the column `x_coordinate` on the `game_centers` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `y_coordinate` on the `game_centers` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "game_centers" ALTER COLUMN "x_coordinate" SET DATA TYPE INTEGER,
ALTER COLUMN "y_coordinate" SET DATA TYPE INTEGER;
