-- CreateEnum
CREATE TYPE "booster_category" AS ENUM ('SPARK_TERAS_UP', 'GAME_SWAP', 'EASY_MODE');

-- AlterEnum
ALTER TYPE "ticket_transaction_type" ADD VALUE 'TOURNAMENT_BOOSTER';

-- AlterTable
ALTER TABLE "game_settings" ADD COLUMN     "easy_difficulty" INTEGER,
ADD COLUMN     "easy_target_score" INTEGER;

-- AlterTable
ALTER TABLE "plays" ADD COLUMN     "teras_booster_ratio" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "booster_masters" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "booster_category" NOT NULL,
    "sub_category" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "fee_tickets" INTEGER NOT NULL,
    "effective_minutes" INTEGER NOT NULL,
    "require_tournament" BOOLEAN NOT NULL,

    CONSTRAINT "booster_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paid_tournament_booster_availables" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "booster_master_id" TEXT NOT NULL,
    "paid_tournament_id" UUID NOT NULL,

    CONSTRAINT "paid_tournament_booster_availables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "active_boosters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_at" TIMESTAMP(3) NOT NULL,
    "category" "booster_category" NOT NULL,
    "sub_category" TEXT NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "active_boosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "active_booster_for_tournaments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_at" TIMESTAMP(3) NOT NULL,
    "category" "booster_category" NOT NULL,
    "sub_category" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "paid_tournament_id" UUID NOT NULL,

    CONSTRAINT "active_booster_for_tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "booster_masters_category_sub_category_variant_key" ON "booster_masters"("category", "sub_category", "variant");

-- CreateIndex
CREATE UNIQUE INDEX "paid_tournament_booster_availables_paid_tournament_id_boost_key" ON "paid_tournament_booster_availables"("paid_tournament_id", "booster_master_id");

-- CreateIndex
CREATE UNIQUE INDEX "active_boosters_user_id_category_sub_category_key" ON "active_boosters"("user_id", "category", "sub_category");

-- CreateIndex
CREATE UNIQUE INDEX "active_booster_for_tournaments_user_id_paid_tournament_id_c_key" ON "active_booster_for_tournaments"("user_id", "paid_tournament_id", "category", "sub_category");

-- AddForeignKey
ALTER TABLE "paid_tournament_booster_availables" ADD CONSTRAINT "paid_tournament_booster_availables_paid_tournament_id_fkey" FOREIGN KEY ("paid_tournament_id") REFERENCES "paid_tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paid_tournament_booster_availables" ADD CONSTRAINT "paid_tournament_booster_availables_booster_master_id_fkey" FOREIGN KEY ("booster_master_id") REFERENCES "booster_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_boosters" ADD CONSTRAINT "active_boosters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_booster_for_tournaments" ADD CONSTRAINT "active_booster_for_tournaments_paid_tournament_id_fkey" FOREIGN KEY ("paid_tournament_id") REFERENCES "paid_tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_booster_for_tournaments" ADD CONSTRAINT "active_booster_for_tournaments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
