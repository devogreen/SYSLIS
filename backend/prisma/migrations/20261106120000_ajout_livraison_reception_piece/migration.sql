-- AlterTable
ALTER TABLE `reception_piece` ADD COLUMN `livraison_id` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `livraison_id` ON `reception_piece`(`livraison_id`);

-- AddForeignKey
ALTER TABLE `reception_piece` ADD CONSTRAINT `reception_piece_ibfk_6` FOREIGN KEY (`livraison_id`) REFERENCES `livraison_piece`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
