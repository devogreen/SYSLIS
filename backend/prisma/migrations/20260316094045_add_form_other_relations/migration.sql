-- AlterTable
ALTER TABLE `livraison` ADD COLUMN `form_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `reception_piece` ADD COLUMN `form_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `remplacements` ADD COLUMN `form_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `validation_demande` ADD COLUMN `form_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `validation_remplacement` ADD COLUMN `form_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `validations` ADD COLUMN `form_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `form_id` ON `livraison`(`form_id`);

-- CreateIndex
CREATE INDEX `form_id` ON `reception_piece`(`form_id`);

-- CreateIndex
CREATE INDEX `form_id` ON `remplacements`(`form_id`);

-- CreateIndex
CREATE INDEX `form_id` ON `validation_demande`(`form_id`);

-- CreateIndex
CREATE INDEX `form_id` ON `validation_remplacement`(`form_id`);

-- CreateIndex
CREATE INDEX `form_id` ON `validations`(`form_id`);

-- AddForeignKey
ALTER TABLE `livraison` ADD CONSTRAINT `livraison_ibfk_7` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remplacements` ADD CONSTRAINT `remplacements_ibfk_6` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `validation_demande` ADD CONSTRAINT `validation_demande_ibfk_4` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `validation_remplacement` ADD CONSTRAINT `validation_remplacement_ibfk_2` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `validations` ADD CONSTRAINT `validations_ibfk_3` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception_piece` ADD CONSTRAINT `reception_piece_ibfk_4` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
