/*
  Warnings:

  - Added the required column `statut` to the `sn_decom` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `forms` MODIFY `type` ENUM('livraison_sn', 'reception_sn', 'remplacement_sn', 'reception_remplacement', 'demande_stock', 'validation_stock', 'reception_stock', 'demande_qr', 'generation_qr', 'impression_qr', 'livraison_qr', 'reception_qr', 'reception_piece', 'livraison_stock', 'decom', 'reception_decom', 'retour_technique') NOT NULL;

-- AlterTable
ALTER TABLE `sn_decom` ADD COLUMN `commentaire_retour` LONGTEXT NULL,
    ADD COLUMN `is_ok` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `last_modified_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    ADD COLUMN `pieces_defectueuses` LONGTEXT NULL,
    ADD COLUMN `pieces_recuperees` LONGTEXT NULL,
    ADD COLUMN `retour_id` INTEGER NULL,
    ADD COLUMN `statut` ENUM('parametrage', 'rebus') NOT NULL,
    ADD COLUMN `updated_at` DATETIME(0) NULL;

-- CreateTable
CREATE TABLE `retour_technique` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `decom_id` INTEGER NOT NULL,
    `liste_decom` LONGTEXT NULL,

    INDEX `form_id`(`form_id`),
    INDEX `decom_id`(`decom_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `retour_id` ON `sn_decom`(`retour_id`);

-- AddForeignKey
ALTER TABLE `sn_decom` ADD CONSTRAINT `sn_decom_ibfk_2` FOREIGN KEY (`retour_id`) REFERENCES `retour_technique`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retour_technique` ADD CONSTRAINT `retour_technique_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retour_technique` ADD CONSTRAINT `retour_technique_ibfk_2` FOREIGN KEY (`decom_id`) REFERENCES `form_decom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
