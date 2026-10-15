-- AlterTable
ALTER TABLE `reception_decom` MODIFY `type` ENUM('validation', 'retour', 'reception', 'verification', 'transmission_maintenance') NOT NULL;
