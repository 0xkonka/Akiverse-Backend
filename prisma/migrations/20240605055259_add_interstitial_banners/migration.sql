-- CreateTable
CREATE TABLE "interstitial_banners" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "image_url" TEXT NOT NULL,
    "external_link" TEXT,
    "display" BOOLEAN NOT NULL DEFAULT true,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "target_area" TEXT,
    "description" TEXT,

    CONSTRAINT "interstitial_banners_pkey" PRIMARY KEY ("id")
);
