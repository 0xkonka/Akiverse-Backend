-- CreateIndex
CREATE INDEX "play_sessions_state_idx" ON "play_sessions"("state");

-- CreateIndex
CREATE INDEX "plays_ended_at_idx" ON "plays"("ended_at");

-- CreateIndex
CREATE INDEX "plays_result_idx" ON "plays"("result");
