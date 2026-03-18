-- AlterTable
ALTER TABLE `stocks` ADD COLUMN `owner` INTEGER NULL;

-- CreateIndex
CREATE INDEX `owner` ON `stocks`(`owner`);

-- AddForeignKey
ALTER TABLE `stocks` ADD CONSTRAINT `stocks_ibfk_6` FOREIGN KEY (`owner`) REFERENCES `users`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;
