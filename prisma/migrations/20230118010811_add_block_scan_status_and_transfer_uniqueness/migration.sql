/*
  Warnings:

  - A unique constraint covering the columns `[block_hash,transaction_index,from,to,token_id]` on the table `transfers` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "block_scan_state" AS ENUM ('MISSED', 'WATCHED', 'SCANNED');

-- AlterTable
ALTER TABLE "blocks" ADD COLUMN     "scan_state" "block_scan_state" NOT NULL DEFAULT 'WATCHED';

-- CreateIndex
CREATE UNIQUE INDEX "transfers_block_hash_transaction_index_from_to_token_id_key" ON "transfers"("block_hash", "transaction_index", "from", "to", "token_id");
