-- Migrate arcade_parts
alter table arcade_parts drop constraint "arcade_parts_pkey";
alter table arcade_parts drop column id;
alter table arcade_parts rename column token_id to id;
alter table arcade_parts add constraint "arcade_parts_pkey" primary key ("id");
alter table arcade_parts alter column id set default floor(random() * 1048576::double precision)::bigint + (floor(random() * 1048576::double precision)::bigint << 20) + (floor(random() * 8388608::double precision)::bigint << 40);

-- Point plays.arcade_machine_id at arcade_machines.token_id
alter table plays rename column arcade_machine_id to _arcade_machine_id;
alter table plays add column arcade_machine_id bigint;
update plays as p set arcade_machine_id = am.token_id from arcade_machines as am where p._arcade_machine_id = am.id;
alter table plays alter column arcade_machine_id set not null;
alter table plays drop column _arcade_machine_id;

-- Migrate arcade machines
alter table arcade_machines drop constraint "arcade_machines_pkey";
alter table arcade_machines drop column id;
alter table arcade_machines rename column token_id to id;
alter table arcade_machines add constraint "arcade_machines_pkey" primary key ("id");
alter table arcade_machines alter column id set default floor(random() * 1048576::double precision)::bigint + (floor(random() * 1048576::double precision)::bigint << 20) + (floor(random() * 8388608::double precision)::bigint << 40);

-- Point plays.game_center_id at game_centers.token_id
alter table plays rename column game_center_id to _game_center_id;
alter table plays add column game_center_id bigint;
update plays as p set game_center_id = gc.token_id from game_centers as gc where p._game_center_id = gc.id;
alter table plays drop column _game_center_id;

-- Point arcade_machines.game_center_id to game_centers.token_id
alter table arcade_machines rename column game_center_id to _game_center_id;
alter table arcade_machines add column game_center_id bigint;
update arcade_machines as am set game_center_id = gc.token_id from game_centers as gc where am._game_center_id = gc.id;
alter table arcade_machines drop column _game_center_id;

-- Migrate game centers
alter table game_centers drop constraint "game_centers_pkey";
alter table game_centers drop column id;
alter table game_centers rename column token_id to id;
alter table game_centers add constraint "game_centers_pkey" primary key ("id");
alter table game_centers alter column id set default floor(random() * 1048576::double precision)::bigint + (floor(random() * 1048576::double precision)::bigint << 20) + (floor(random() * 8388608::double precision)::bigint << 40);

-- DropIndex
DROP INDEX "arcade_machines_token_id_key";
DROP INDEX "arcade_parts_token_id_key";
DROP INDEX "game_centers_token_id_key";

-- AddForeignKey
ALTER TABLE "arcade_machines" ADD CONSTRAINT "arcade_machines_game_center_id_fkey" FOREIGN KEY ("game_center_id") REFERENCES "game_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "plays" ADD CONSTRAINT "plays_arcade_machine_id_fkey" FOREIGN KEY ("arcade_machine_id") REFERENCES "arcade_machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "plays" ADD CONSTRAINT "plays_game_center_id_fkey" FOREIGN KEY ("game_center_id") REFERENCES "game_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- CreateIndex
CREATE UNIQUE INDEX "arcade_machines_game_center_id_position_key" ON "arcade_machines"("game_center_id", "position");
-- Add checks
ALTER TABLE "arcade_machines"
    ADD CONSTRAINT can_only_place_deposited_arcade_machines
        CHECK (game_center_id is null and "position" is null or state = 'DEPOSITED');
