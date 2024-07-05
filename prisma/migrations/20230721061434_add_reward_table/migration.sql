-- CreateEnum
CREATE TYPE "reward_item_type" AS ENUM ('TERAS', 'ARCADE_PART', 'JUNK_PART');

-- CreateEnum
CREATE TYPE "reward_category" AS ENUM ('ROM', 'ACCUMULATOR', 'UPPER_CABINET', 'LOWER_CABINET', 'TERAS');

-- CreateTable
CREATE TABLE "rewards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "reward_item_type" "reward_item_type" NOT NULL,
    "category" "reward_category" NOT NULL,
    "sub_category" TEXT,
    "amount" INTEGER NOT NULL,
    "available_until" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "rewards_user_id_idx" ON "rewards"("user_id");
