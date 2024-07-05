-- AlterTable
ALTER TABLE "arcade_machines"
    ADD CONSTRAINT arcade_machines_check_position_value_positive
        CHECK ("position" >= 1);

