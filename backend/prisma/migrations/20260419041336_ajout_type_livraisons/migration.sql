-- DropIndex
DROP INDEX `nom_role` ON `roles`;

-- AlterTable
ALTER TABLE `Livraisons` MODIFY `commentaire_livraison` VARCHAR(255) NULL,
    MODIFY `type` ENUM('livraison_piece', 'livraison_commerciale', 'livraison_qr') NOT NULL;
