-- AlterTable
ALTER TABLE `livraison_tpe_repare` MODIFY `statut` ENUM('en_cours', 'livre', 'retourne', 'annule', 'clos') NOT NULL;

-- AlterTable
ALTER TABLE `reception_tpe_repare` MODIFY `type` ENUM('reception', 'retour', 'cloture') NOT NULL;
