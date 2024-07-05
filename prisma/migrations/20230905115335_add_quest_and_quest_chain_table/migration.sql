-- AlterEnum
ALTER TYPE "collectible_item_category" ADD VALUE 'TITLE';

-- AlterEnum
ALTER TYPE "reward_category" ADD VALUE 'TITLE';

-- CreateTable
CREATE TABLE "quest_chains" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "quest_chain_master_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expired_at" TIMESTAMP(3),

    CONSTRAINT "quest_chains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quest_chain_id" UUID NOT NULL,
    "quest_master_id" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quest_chains_user_id_idx" ON "quest_chains"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "quest_chains_user_id_quest_chain_master_id_key" ON "quest_chains"("user_id", "quest_chain_master_id");

-- CreateIndex
CREATE INDEX "quests_quest_chain_id_idx" ON "quests"("quest_chain_id");

-- CreateIndex
CREATE UNIQUE INDEX "quests_quest_chain_id_quest_master_id_key" ON "quests"("quest_chain_id", "quest_master_id");

-- AddForeignKey
ALTER TABLE "quest_chains" ADD CONSTRAINT "quest_chains_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_quest_chain_id_fkey" FOREIGN KEY ("quest_chain_id") REFERENCES "quest_chains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "title_sub_category" TEXT NOT NULL DEFAULT 'DEFAULT';
