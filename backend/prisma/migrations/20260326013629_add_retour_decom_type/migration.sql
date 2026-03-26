-- AlterTable
ALTER TABLE `retour_decom` ADD COLUMN `type` ENUM('verification', 'cloture') NOT NULL DEFAULT 'verification';
