-- AlterEnum
ALTER TYPE "withdrawal_state" ADD VALUE 'ERROR';

-- AlterTable
ALTER TABLE "withdrawals" ADD COLUMN     "errorMessage" TEXT;
