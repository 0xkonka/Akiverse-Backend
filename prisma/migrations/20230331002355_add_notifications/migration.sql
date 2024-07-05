-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('ACTIVITY', 'INFORMATION');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "notification_type" "notification_type" NOT NULL,
    "token_id" TEXT,
    "nft_type" "nft_type" NOT NULL,
    "message_json" JSONB NOT NULL,
    "message_detail_json" JSONB,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
