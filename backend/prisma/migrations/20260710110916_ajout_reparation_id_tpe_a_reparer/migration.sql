-- AlterTable
ALTER TABLE `tpe_a_reparer` ADD COLUMN `reparation_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `tpe_a_reparer` ADD CONSTRAINT `tpe_a_reparer_ibfk_5` FOREIGN KEY (`reparation_id`) REFERENCES `reparation_tpe`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
