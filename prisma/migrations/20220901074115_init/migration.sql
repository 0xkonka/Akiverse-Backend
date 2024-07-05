-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arcade_machines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "animation_url" TEXT,
    "external_url" TEXT,
    "game" TEXT NOT NULL,
    "fuel" BIGINT NOT NULL,
    "max_fuel" BIGINT NOT NULL,
    "energy" BIGINT NOT NULL,
    "max_energy" BIGINT NOT NULL,
    "boost" BIGINT NOT NULL,

    CONSTRAINT "arcade_machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arcade_parts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "animation_url" TEXT,
    "external_url" TEXT,
    "type" TEXT NOT NULL,

    CONSTRAINT "arcade_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_centers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "animation_url" TEXT,
    "external_url" TEXT,
    "x_coordinate" BIGINT NOT NULL,
    "y_coordinate" BIGINT NOT NULL,
    "area" TEXT NOT NULL,
    "size" TEXT NOT NULL,

    CONSTRAINT "game_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_of_kingdoms_item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token_id" BIGINT NOT NULL,
    "owner" TEXT NOT NULL,
    "last_block" INTEGER NOT NULL,

    CONSTRAINT "league_of_kingdoms_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_address_key" ON "users"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "arcade_machines_token_id_key" ON "arcade_machines"("token_id");

-- CreateIndex
CREATE UNIQUE INDEX "arcade_parts_token_id_key" ON "arcade_parts"("token_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_centers_token_id_key" ON "game_centers"("token_id");

-- CreateIndex
CREATE UNIQUE INDEX "league_of_kingdoms_item_token_id_key" ON "league_of_kingdoms_item"("token_id");
