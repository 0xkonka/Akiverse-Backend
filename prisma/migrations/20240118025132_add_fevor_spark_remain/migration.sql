-- AlterTable
ALTER TABLE "arcade_machines" ADD COLUMN     "fever_spark_remain" INTEGER;

-- Migrate
UPDATE "arcade_machines"
SET fever_spark_remain = 30
WHERE energy = max_energy;

alter table public.arcade_machines
    add constraint fever_spark_remain_over_0_to_under_30
        check (fever_spark_remain >= 0 and fever_spark_remain <= 30);

