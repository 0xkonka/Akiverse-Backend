-- CreateEnum
CREATE TYPE "operating_system" AS ENUM ('IOS', 'ANDROID');

-- CreateTable
CREATE TABLE "app_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "os" "operating_system" NOT NULL,
    "version" TEXT NOT NULL,
    "under_review" BOOLEAN NOT NULL,

    CONSTRAINT "app_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_versions_os_version_idx" ON "app_versions"("os", "version");

-- CreateIndex
CREATE UNIQUE INDEX "app_versions_os_version_key" ON "app_versions"("os", "version");
