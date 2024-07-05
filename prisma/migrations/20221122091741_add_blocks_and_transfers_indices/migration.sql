-- CreateIndex
CREATE INDEX "blocks_parent_hash_idx" ON "blocks"("parent_hash");

-- CreateIndex
CREATE INDEX "blocks_number_idx" ON "blocks"("number");

-- CreateIndex
CREATE INDEX "blocks_state_idx" ON "blocks"("state");

-- CreateIndex
CREATE INDEX "transfers_block_hash_idx" ON "transfers"("block_hash");

-- CreateIndex
CREATE INDEX "transfers_state_idx" ON "transfers"("state");

-- CreateIndex
CREATE INDEX "transfers_token_id_idx" ON "transfers"("token_id");
