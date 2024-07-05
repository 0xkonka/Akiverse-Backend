-- CreateEnum
CREATE TYPE "PaidTournamentType" AS ENUM ('SPARK_COUNT', 'SPARK_TERAS');

-- AlterTable
ALTER TABLE "paid_tournaments" ADD COLUMN     "paid_tournament_type" "PaidTournamentType" NOT NULL DEFAULT 'SPARK_COUNT';
