-- AlterTable
ALTER TABLE users
    ADD CONSTRAINT akir_balance_over_zero CHECK ( akir_balance >= 0 ),
    ADD CONSTRAINT akv_balance_over_zero CHECK ( akv_balance >= 0);

-- AlterTable
ALTER TABLE "arcade_machines" ADD COLUMN     "auto_renew_lease" BOOLEAN NOT NULL DEFAULT false;