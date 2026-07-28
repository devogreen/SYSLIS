-- AlterTable
ALTER TABLE `demande_qr` MODIFY `statut` ENUM('soumise', 'generee', 'imprimee', 'livree', 'recue', 'suspendue', 'annulee') NOT NULL;

-- AlterTable
ALTER TABLE `forms` MODIFY `type` ENUM('livraison_sn', 'reception_sn', 'remplacement_sn', 'reception_remplacement', 'demande_stock', 'validation_stock', 'reception_stock', 'demande_qr', 'generation_qr', 'impression_qr', 'livraison_qr', 'reception_qr', 'reception_piece', 'livraison_stock', 'decom', 'reception_decom', 'retour_technique', 'retour_decom', 'demande_rebut', 'validation_rebut', 'livraison_tpe_repare', 'reception_tpe_repare', 'reparation_tpe', 'mise_en_reparation', 'retour_demande_qr') NOT NULL;

-- CreateTable
CREATE TABLE `retour_demande_qr` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `demande_id` INTEGER NOT NULL,
    `type` ENUM('annulation', 'suspension', 'retour_generation') NOT NULL,

    INDEX `demande_id`(`demande_id`),
    INDEX `form_id`(`form_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `retour_demande_qr` ADD CONSTRAINT `retour_demande_qr_ibfk_1` FOREIGN KEY (`demande_id`) REFERENCES `demande_qr`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retour_demande_qr` ADD CONSTRAINT `retour_demande_qr_ibfk_2` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
