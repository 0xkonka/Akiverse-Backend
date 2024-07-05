/*
  Warnings:

  - A unique constraint covering the columns `[gameCenterId,position]` on the table `arcade_machines` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "arcade_machines_game_center_id_position_key" ON "arcade_machines"("game_center_id", "position");
