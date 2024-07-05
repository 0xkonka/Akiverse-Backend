-- AlterTable
ALTER TABLE "withdrawals" ADD COLUMN     "nonce" INTEGER,
ADD COLUMN     "response" TEXT,
ADD COLUMN     "signer_address" TEXT;

ALTER TABLE withdrawals
    ALTER COLUMN signer_address TYPE text COLLATE case_insensitive;
