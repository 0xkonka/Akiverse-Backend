-- CreateEnum
CREATE TYPE "transfer_state" AS ENUM ('CONFIRMED', 'PENDING', 'INVALIDATED', 'FROZEN');

-- AlterTable
ALTER TABLE "currency_transfers" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "currency_transfers" ALTER COLUMN "state" SET DATA TYPE transfer_state USING (state::text)::transfer_state;
ALTER TABLE "currency_transfers" ALTER COLUMN "state" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "transfers" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "transfers" ALTER COLUMN "state" SET DATA TYPE transfer_state USING (state::text)::transfer_state;
ALTER TABLE "transfers" ALTER COLUMN "state" SET DEFAULT 'PENDING';
