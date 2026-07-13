-- AlterTable
ALTER TABLE `fichiers` MODIFY `type_formulaire` ENUM('livraison', 'remplacement', 'demande', 'demande_qr', 'decom', 'rebut', 'mise_en_reparation_tpe', 'reparation_tpe') NOT NULL;

-- AlterTable
ALTER TABLE `forms` MODIFY `type` ENUM('livraison_sn', 'reception_sn', 'remplacement_sn', 'reception_remplacement', 'demande_stock', 'validation_stock', 'reception_stock', 'demande_qr', 'generation_qr', 'impression_qr', 'livraison_qr', 'reception_qr', 'reception_piece', 'livraison_stock', 'decom', 'reception_decom', 'retour_technique', 'retour_decom', 'demande_rebut', 'validation_rebut', 'livraison_tpe_repare', 'reception_tpe_repare', 'reparation_tpe', 'mise_en_reparation') NOT NULL;

-- AlterTable
ALTER TABLE `tpe_a_reparer` ADD COLUMN `mise_en_reparation_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `mise_en_reparation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `quantite` INTEGER NULL,
    `liste_sn` LONGTEXT NULL,

    INDEX `form_id`(`form_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tpe_a_reparer` ADD CONSTRAINT `tpe_a_reparer_ibfk_6` FOREIGN KEY (`mise_en_reparation_id`) REFERENCES `mise_en_reparation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mise_en_reparation` ADD CONSTRAINT `mise_en_reparation_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
