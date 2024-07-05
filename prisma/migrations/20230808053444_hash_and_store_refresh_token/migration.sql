/*
  Warnings:

  - A unique constraint covering the columns `[token_hash]` on the table `refresh_tokens` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "token_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
