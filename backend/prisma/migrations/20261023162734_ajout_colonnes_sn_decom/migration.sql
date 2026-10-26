-- AlterTable
ALTER TABLE `sn_decom` ADD COLUMN `has_carte_sim` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `has_carton` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `has_chargeur` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `model_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `model_id` ON `sn_decom`(`model_id`);

-- AddForeignKey
ALTER TABLE `sn_decom` ADD CONSTRAINT `sn_decom_ibfk_2` FOREIGN KEY (`model_id`) REFERENCES `model_piece`(`id_model`) ON DELETE RESTRICT ON UPDATE CASCADE;
