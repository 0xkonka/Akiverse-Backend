-- CreateTable
CREATE TABLE "batch_controls" (
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" TEXT NOT NULL,

    CONSTRAINT "batch_controls_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "rovi_tournaments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tournament_id" TEXT NOT NULL,
    "tournament_type" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "winner_checked" BOOLEAN NOT NULL DEFAULT false,
    "entry_fee" DECIMAL(65,30) NOT NULL,
    "entry_fee_type" TEXT NOT NULL,
    "entry_fee_asset_id" INTEGER NOT NULL,
    "min_player_count" INTEGER NOT NULL,
    "player_count" INTEGER,
    "winner_count" INTEGER,
    "prize_summary" DECIMAL(65,30),
    "prize_type" TEXT,
    "invalid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "rovi_tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rovi_tournaments_tournament_id_key" ON "rovi_tournaments"("tournament_id");

-- Initial BatchControlRecord
INSERT INTO "batch_controls" (code, value) values ('ROVI_LAST_EXECUTE_NEWER_TOURNAMENT_ID','');