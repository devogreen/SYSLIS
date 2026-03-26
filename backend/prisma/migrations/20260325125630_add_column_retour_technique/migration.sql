-- AlterTable
ALTER TABLE `retour_technique` ADD COLUMN `is_ok` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `pieces_defectueuses` LONGTEXT NULL,
    ADD COLUMN `pieces_recuperees` LONGTEXT NULL,
    ADD COLUMN `statut` ENUM('parametrage', 'rebus', 'checking') NOT NULL DEFAULT 'checking';
