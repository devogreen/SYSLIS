-- AlterTable
ALTER TABLE `demandes` ADD COLUMN `form_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `form_id` ON `demandes`(`form_id`);

-- AddForeignKey
ALTER TABLE `demandes` ADD CONSTRAINT `demandes_ibfk_4` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
