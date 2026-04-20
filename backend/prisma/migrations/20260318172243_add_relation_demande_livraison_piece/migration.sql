-- CreateIndex
CREATE INDEX `demande_id` ON `livraison_piece`(`demande_id`);

-- AddForeignKey
ALTER TABLE `livraison_piece` ADD CONSTRAINT `livraison_piece_ibfk_5` FOREIGN KEY (`demande_id`) REFERENCES `demandes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
