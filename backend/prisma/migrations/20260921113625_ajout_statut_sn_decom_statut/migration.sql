-- AlterTable
ALTER TABLE `retour_technique` MODIFY `statut` ENUM('parametrage', 'rebus', 'checking', 'a_reparer', 'attente_checking') NOT NULL DEFAULT 'checking';

-- AlterTable
ALTER TABLE `sn_decom` MODIFY `statut` ENUM('parametrage', 'rebus', 'checking', 'a_reparer', 'attente_checking') NOT NULL DEFAULT 'checking';
