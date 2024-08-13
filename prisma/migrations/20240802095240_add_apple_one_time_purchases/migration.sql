-- CreateTable
CREATE TABLE "apple_one_time_purchases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "status" "purchase_status" NOT NULL DEFAULT 'UNPROCESSED',
    "product_id" TEXT NOT NULL,
    "receipt" TEXT NOT NULL,
    "signed_response" TEXT,
    "response_detail" TEXT,
    "error_detail" TEXT,

    CONSTRAINT "apple_one_time_purchases_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "apple_one_time_purchases" ADD CONSTRAINT "apple_one_time_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
