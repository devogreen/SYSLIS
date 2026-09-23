-- AlterTable
ALTER TABLE `form_decom` MODIFY `statut` ENUM('en_cours', 'retourne', 'recu', 'clos', 'verification', 'complet') NOT NULL;
