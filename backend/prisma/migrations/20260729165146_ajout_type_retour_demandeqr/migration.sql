-- AlterTable
ALTER TABLE `retour_demande_qr` MODIFY `type` ENUM('annulation', 'suspension', 'retour_generation', 'annulation_suspension') NOT NULL;
