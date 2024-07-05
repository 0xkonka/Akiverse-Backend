-- CreateEnum
CREATE TYPE "news_category" AS ENUM ('INFO', 'EVENT', 'PROMO');

-- CreateTable
CREATE TABLE "news" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "news_category" NOT NULL,
    "title" TEXT NOT NULL,
    "external_link" TEXT,
    "display" BOOLEAN NOT NULL DEFAULT true,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "main_image_url" TEXT NOT NULL,
    "bg_image_url" TEXT NOT NULL,
    "external_link" TEXT,
    "display" BOOLEAN NOT NULL DEFAULT true,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);
