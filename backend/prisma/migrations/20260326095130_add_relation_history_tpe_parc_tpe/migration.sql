-- CreateIndex
CREATE INDEX `id_tpe` ON `history_tpe`(`id_tpe`);

-- AddForeignKey
ALTER TABLE `history_tpe` ADD CONSTRAINT `history_tpe_ibfk_4` FOREIGN KEY (`id_tpe`) REFERENCES `parc_tpe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
