-- AlterTable
ALTER TABLE "plays" RENAME COLUMN "owner_akir_reward" TO "owner_teras_reward";
ALTER TABLE "plays" RENAME COLUMN "player_akir_reward" TO "player_teras_reward";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "teras_balance" DECIMAL(78,0) NOT NULL DEFAULT 0,
                    ADD CONSTRAINT teras_balance_over_zero CHECK ( teras_balance >= 0 );