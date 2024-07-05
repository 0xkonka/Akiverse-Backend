-- CreateEnum
CREATE TYPE "front_end_type" AS ENUM ('WM', 'GP');

-- AlterTable
ALTER TABLE "banners" ADD COLUMN     "front_end_type" "front_end_type" NOT NULL DEFAULT 'WM',
ADD COLUMN     "target_area" TEXT;
