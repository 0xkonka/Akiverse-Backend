/*
  Warnings:

  - You are about to alter the column `energy` on the `arcade_machines` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `max_energy` on the `arcade_machines` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `boost` on the `arcade_machines` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Float`.

*/
-- AlterTable
ALTER TABLE "arcade_machines" ALTER COLUMN "energy" SET DATA TYPE INTEGER,
ALTER COLUMN "max_energy" SET DATA TYPE INTEGER,
ALTER COLUMN "boost" SET DATA TYPE DOUBLE PRECISION;
