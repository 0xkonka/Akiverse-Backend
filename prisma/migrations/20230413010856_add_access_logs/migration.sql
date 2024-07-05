-- CreateTable
CREATE TABLE "access_logs" (
    "date" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "access_count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("date","user_id")
);
