-- CreateTable
CREATE TABLE "campaign_participants" (
    "user_id" UUID NOT NULL,
    "campaign_id" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "campaign_participants_user_id_campaign_id_idx" ON "campaign_participants"("user_id", "campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_participants_user_id_campaign_id_key" ON "campaign_participants"("user_id", "campaign_id");
