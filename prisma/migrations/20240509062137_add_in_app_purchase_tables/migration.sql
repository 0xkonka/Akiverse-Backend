-- CreateEnum
CREATE TYPE "purchase_status" AS ENUM ('UNPROCESSED', 'GRANTED', 'CANCELED', 'INVALID');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "tickets" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "users" ADD CONSTRAINT user_tickets_value_positive
    CHECK ( "tickets" >= 0 );

-- CreateTable
CREATE TABLE "google_one_time_purchases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "status" "purchase_status" NOT NULL DEFAULT 'UNPROCESSED',
    "product_id" TEXT NOT NULL,
    "purchase_token" TEXT NOT NULL,
    "error_detail" TEXT,
    "purchase_detail" TEXT,

    CONSTRAINT "google_one_time_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "google_one_time_purchases_purchase_token_key" ON "google_one_time_purchases"("purchase_token");

-- AddForeignKey
ALTER TABLE "google_one_time_purchases" ADD CONSTRAINT "google_one_time_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
