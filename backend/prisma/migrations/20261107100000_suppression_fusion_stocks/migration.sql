-- AlterTable
ALTER TABLE `stocks` ADD COLUMN `deleted_at` DATETIME(0) NULL,
    ADD COLUMN `deleted_by` INTEGER NULL,
    ADD COLUMN `motif_suppression` TEXT NULL,
    ADD COLUMN `fusionne_dans` INTEGER NULL;

-- CreateIndex
CREATE INDEX `deleted_by` ON `stocks`(`deleted_by`);

-- CreateIndex
CREATE INDEX `fusionne_dans` ON `stocks`(`fusionne_dans`);

-- AddForeignKey
ALTER TABLE `stocks` ADD CONSTRAINT `stocks_ibfk_7` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stocks` ADD CONSTRAINT `stocks_ibfk_8` FOREIGN KEY (`fusionne_dans`) REFERENCES `stocks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
