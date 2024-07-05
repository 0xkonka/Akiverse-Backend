-- CreateTable
CREATE TABLE "minimum_app_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "os" "operating_system" NOT NULL,
    "minimum_version" TEXT NOT NULL,

    CONSTRAINT "minimum_app_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "minimum_app_versions_os_key" ON "minimum_app_versions"("os");
