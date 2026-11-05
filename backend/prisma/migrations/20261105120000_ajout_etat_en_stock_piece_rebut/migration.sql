-- AlterTable
ALTER TABLE `history_piece_rebut` MODIFY `etat` ENUM('fonctionnel', 'defectueux', 'utilise', 'en_stock') NOT NULL;

-- AlterTable
ALTER TABLE `mouvement_piece_rebut` ADD COLUMN `mouvement_stock_id` INTEGER NULL,
    MODIFY `ancien_etat` ENUM('fonctionnel', 'defectueux', 'utilise', 'en_stock') NULL,
    MODIFY `nouvel_etat` ENUM('fonctionnel', 'defectueux', 'utilise', 'en_stock') NOT NULL;

-- AlterTable
ALTER TABLE `pieces_rebut` MODIFY `etat` ENUM('fonctionnel', 'defectueux', 'utilise', 'en_stock') NOT NULL;

-- CreateIndex
CREATE INDEX `mouvement_stock_id` ON `mouvement_piece_rebut`(`mouvement_stock_id`);

-- AddForeignKey
ALTER TABLE `mouvement_piece_rebut` ADD CONSTRAINT `mouvement_piece_rebut_ibfk_5` FOREIGN KEY (`mouvement_stock_id`) REFERENCES `mouvement_stock`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
