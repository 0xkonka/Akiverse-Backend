-- CreateTable
CREATE TABLE "paid_tournaments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entry_fee_tickets" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "image_url" TEXT,
    "prize_teras_amount" DECIMAL(65,30),
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "game_id" TEXT,

    CONSTRAINT "paid_tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paid_tournament_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "used_tickets" INTEGER NOT NULL,
    "country_from_ip" TEXT,
    "paid_tournament_id" UUID NOT NULL,

    CONSTRAINT "paid_tournament_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "paid_tournament_entries_paid_tournament_id_user_id_key" ON "paid_tournament_entries"("paid_tournament_id", "user_id");

-- AddForeignKey
ALTER TABLE "paid_tournament_entries" ADD CONSTRAINT "paid_tournament_entries_paid_tournament_id_fkey" FOREIGN KEY ("paid_tournament_id") REFERENCES "paid_tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paid_tournament_entries" ADD CONSTRAINT "paid_tournament_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
