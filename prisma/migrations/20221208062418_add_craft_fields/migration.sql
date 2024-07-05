-- AlterTable
ALTER TABLE "arcade_parts" ADD COLUMN     "crafted_arcade_machine_id" TEXT,
ADD COLUMN     "destroyed_at" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "arcade_parts" ADD CONSTRAINT "arcade_parts_crafted_arcade_machine_id_fkey" FOREIGN KEY ("crafted_arcade_machine_id") REFERENCES "arcade_machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
