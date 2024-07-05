-- CreateTable
CREATE TABLE "paid_tournament_prize_claim_ignore_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "paid_tournament_prize_claim_ignore_users_user_id_key" ON "paid_tournament_prize_claim_ignore_users"("user_id");

-- AddForeignKey
ALTER TABLE "paid_tournament_prize_claim_ignore_users" ADD CONSTRAINT "paid_tournament_prize_claim_ignore_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
