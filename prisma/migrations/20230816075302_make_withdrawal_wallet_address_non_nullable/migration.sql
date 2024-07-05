/*
  Warnings:

  - Made the column `wallet_address` on table `withdrawals` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "withdrawals" ALTER COLUMN "wallet_address" SET NOT NULL;
