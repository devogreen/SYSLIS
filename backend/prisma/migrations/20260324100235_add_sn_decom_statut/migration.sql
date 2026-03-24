-- AlterTable
ALTER TABLE `sn_decom` MODIFY `statut` ENUM('parametrage', 'rebus', 'checking') NOT NULL DEFAULT 'checking';
