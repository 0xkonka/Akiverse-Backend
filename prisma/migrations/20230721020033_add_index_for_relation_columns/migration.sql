-- CreateIndex
CREATE INDEX "arcade_machines_user_id_idx" ON "arcade_machines"("user_id");

-- CreateIndex
CREATE INDEX "arcade_machines_game_center_id_idx" ON "arcade_machines"("game_center_id");

-- CreateIndex
CREATE INDEX "arcade_parts_user_id_idx" ON "arcade_parts"("user_id");

-- CreateIndex
CREATE INDEX "arcade_parts_craft_id_idx" ON "arcade_parts"("craft_id");

-- CreateIndex
CREATE INDEX "craft_user_id_idx" ON "craft"("user_id");

-- CreateIndex
CREATE INDEX "deposits_user_id_idx" ON "deposits"("user_id");

-- CreateIndex
CREATE INDEX "extract_initial_inventories_season_id_idx" ON "extract_initial_inventories"("season_id");

-- CreateIndex
CREATE INDEX "extracts_user_id_idx" ON "extracts"("user_id");

-- CreateIndex
CREATE INDEX "extracts_arcade_machine_id_idx" ON "extracts"("arcade_machine_id");

-- CreateIndex
CREATE INDEX "game_centers_user_id_idx" ON "game_centers"("user_id");

-- CreateIndex
CREATE INDEX "junks_user_id_idx" ON "junks"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_notification_type_idx" ON "notifications"("user_id", "notification_type");

-- CreateIndex
CREATE INDEX "play_sessions_player_id_idx" ON "play_sessions"("player_id");

-- CreateIndex
CREATE INDEX "play_sessions_arcade_machine_id_idx" ON "play_sessions"("arcade_machine_id");

-- CreateIndex
CREATE INDEX "play_sessions_arcade_machine_owner_id_idx" ON "play_sessions"("arcade_machine_owner_id");

-- CreateIndex
CREATE INDEX "play_sessions_game_center_id_idx" ON "play_sessions"("game_center_id");

-- CreateIndex
CREATE INDEX "play_sessions_game_center_owner_id_idx" ON "play_sessions"("game_center_owner_id");

-- CreateIndex
CREATE INDEX "withdrawals_user_id_idx" ON "withdrawals"("user_id");
