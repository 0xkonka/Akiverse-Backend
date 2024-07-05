-- AlterTable
ALTER TABLE "paid_tournaments" ADD COLUMN     "result_recorded" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "paid_tournament_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "prize_teras_amount" DECIMAL(65,30) NOT NULL,
    "prize_usdc_amount" DECIMAL(65,30),
    "prize_idr_amount" DECIMAL(65,30),

    CONSTRAINT "paid_tournament_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "paid_tournament_results_user_id_tournament_id_key" ON "paid_tournament_results"("user_id", "tournament_id");

-- CreateIndex
CREATE UNIQUE INDEX "paid_tournament_results_tournament_id_rank_key" ON "paid_tournament_results"("tournament_id", "rank");
