-- CreateEnum
CREATE TYPE "BannerImageType" AS ENUM ('BANNER', 'INTERSTITIAL');

-- CreateTable
CREATE TABLE "banner_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_name" TEXT NOT NULL,
    "description" TEXT,
    "banner_image_type" "BannerImageType" NOT NULL,
    "s3_path" TEXT NOT NULL,

    CONSTRAINT "banner_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banner_images_s3_path_key" ON "banner_images"("s3_path");

-- CreateIndex
CREATE UNIQUE INDEX "banner_images_banner_image_type_file_name_key" ON "banner_images"("banner_image_type", "file_name");
