/*
  Warnings:

  - You are about to drop the column `produits_livres` on the `livraison_piece` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `livraison_piece` DROP FOREIGN KEY `livraison_piece_ibfk_1`;

-- AlterTable
ALTER TABLE `forms` MODIFY `type` ENUM('livraison_sn', 'reception_sn', 'remplacement_sn', 'reception_remplacement', 'demande_stock', 'validation_stock', 'reception_stock', 'demande_qr', 'generation_qr', 'impression_qr', 'livraison_qr', 'reception_qr', 'reception_piece', 'livraison_stock') NOT NULL;

-- AlterTable
ALTER TABLE `livraison_piece` DROP COLUMN `produits_livres`,
    ADD COLUMN `details_demande` LONGTEXT NULL,
    ADD COLUMN `details_demandeur` LONGTEXT NULL,
    ADD COLUMN `form_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `livraison_piece` ADD CONSTRAINT `livraison_piece_ibfk_3` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
