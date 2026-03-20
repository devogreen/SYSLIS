-- AlterTable
ALTER TABLE `fichiers` MODIFY `type_formulaire` ENUM('livraison', 'remplacement', 'demande', 'demande_qr', 'decom') NOT NULL;
