-- AlterTable
ALTER TABLE "users" ADD COLUMN     "receive_bulk_email" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "unsubscribe_token" UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX "users_unsubscribe_token_key" ON "users"("unsubscribe_token");
