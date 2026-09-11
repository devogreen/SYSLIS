-- AlterTable
ALTER TABLE `mouvement_stock` ADD COLUMN `created_by` INTEGER NULL;

-- CreateIndex
CREATE INDEX `created_by` ON `mouvement_stock`(`created_by`);

-- AddForeignKey
ALTER TABLE `mouvement_stock` ADD CONSTRAINT `mouvement_stock_ibfk_9` FOREIGN KEY (`created_by`) REFERENCES `users`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;
