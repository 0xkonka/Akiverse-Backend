-- DropIndex
DROP INDEX "league_of_kingdoms_item_token_id_key";

-- AlterTable
ALTER TABLE "arcade_machines" ADD COLUMN     "owner_wallet_address" TEXT;

-- AlterTable
ALTER TABLE "arcade_parts" ADD COLUMN     "owner_wallet_address" TEXT;

-- AlterTable
ALTER TABLE "game_centers" ADD COLUMN     "owner_wallet_address" TEXT;

-- AlterTable
alter table league_of_kingdoms_item drop column id;
alter table league_of_kingdoms_item rename column token_id to id;
alter table league_of_kingdoms_item rename column owner to owner_wallet_address;

alter table "league_of_kingdoms_item" add constraint "league_of_kingdoms_item_pkey" primary key ("id");
