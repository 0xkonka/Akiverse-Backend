-- CreateTable
CREATE TABLE "plays" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "arcade_machine_id" UUID NOT NULL,
    "game_center_id" UUID NOT NULL,
    "game_center_owner_id" UUID NOT NULL,
    "earned_akir_amount" BIGINT NOT NULL DEFAULT 0,
    "arcade_machine_owner_fee_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "arcade_machine_owner_fee_akir_amount" BIGINT NOT NULL DEFAULT 0,
    "play_start_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "play_end_at" TIMESTAMP(3),

    CONSTRAINT "plays_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "plays" ADD CONSTRAINT "plays_arcade_machine_id_fkey" FOREIGN KEY ("arcade_machine_id") REFERENCES "arcade_machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plays" ADD CONSTRAINT "plays_game_center_id_fkey" FOREIGN KEY ("game_center_id") REFERENCES "game_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plays" ADD CONSTRAINT "plays_game_center_owner_id_fkey" FOREIGN KEY ("game_center_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plays" ADD CONSTRAINT "plays_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
