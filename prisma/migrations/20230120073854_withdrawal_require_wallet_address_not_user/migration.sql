-- DropForeignKey
ALTER TABLE "withdrawals" DROP CONSTRAINT "withdrawals_user_id_fkey";

-- AlterTable
ALTER TABLE "withdrawals" ALTER COLUMN "user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
