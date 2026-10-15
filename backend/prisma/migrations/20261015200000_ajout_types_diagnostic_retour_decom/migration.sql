-- AlterTable
ALTER TABLE `retour_decom` MODIFY `type` ENUM('verification', 'cloture', 'confirmation_diagnostic', 'annulation_diagnostic') NOT NULL DEFAULT 'verification';
