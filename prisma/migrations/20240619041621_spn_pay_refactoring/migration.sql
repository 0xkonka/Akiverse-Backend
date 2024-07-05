/*
  Warnings:

  - You are about to drop the column `paid_tournament_entry_id` on the `spn_pay_results` table. All the data in the column will be lost.
  - You are about to drop the column `submit_detail` on the `spn_pay_results` table. All the data in the column will be lost.
  - Added the required column `spn_pay_send_id` to the `spn_pay_results` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "currency_type" ADD VALUE 'USDC';

-- AlterTable
ALTER TABLE "paid_tournaments" ADD COLUMN     "prize_sent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "spn_pay_results" DROP COLUMN "paid_tournament_entry_id",
DROP COLUMN "submit_detail",
ADD COLUMN     "response" TEXT,
ADD COLUMN     "spn_pay_send_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "spn_pay_send" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_tournament_entry_id" UUID NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "spn_pay_send_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "spn_pay_results" ADD CONSTRAINT "spn_pay_results_spn_pay_send_id_fkey" FOREIGN KEY ("spn_pay_send_id") REFERENCES "spn_pay_send"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
