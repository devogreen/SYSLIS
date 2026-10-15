-- AlterTable
ALTER TABLE `forms` MODIFY `type` ENUM('livraison_sn', 'reception_sn', 'remplacement_sn', 'reception_remplacement', 'demande_stock', 'validation_stock', 'reception_stock', 'demande_qr', 'generation_qr', 'impression_qr', 'livraison_qr', 'reception_qr', 'reception_piece', 'livraison_stock', 'decom', 'reception_decom', 'retour_technique', 'retour_decom', 'demande_rebut', 'validation_rebut', 'livraison_tpe_repare', 'reception_tpe_repare', 'reparation_tpe', 'mise_en_reparation', 'retour_demande_qr', 'livraison_param_decom', 'reception_param_decom', 'validation_reparation_tpe') NOT NULL;

-- AlterTable
ALTER TABLE `reparation_tpe` ADD COLUMN `decom_id` INTEGER NULL,
    ADD COLUMN `statut` ENUM('en_reparation', 'valide', 'livre', 'annule') NOT NULL DEFAULT 'en_reparation';

-- Données : les réparations existantes ont déjà généré leur livraison (ancien fonctionnement)
UPDATE `reparation_tpe` SET `statut` = 'livre';

-- CreateIndex
CREATE INDEX `decom_id` ON `reparation_tpe`(`decom_id`);

-- CreateTable
CREATE TABLE `validation_reparation_tpe` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `reparation_id` INTEGER NOT NULL,
    `quantite` INTEGER NULL,
    `liste_sn` LONGTEXT NULL,

    INDEX `form_id`(`form_id`),
    INDEX `reparation_id`(`reparation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reparation_tpe` ADD CONSTRAINT `reparation_tpe_ibfk_2` FOREIGN KEY (`decom_id`) REFERENCES `form_decom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `validation_reparation_tpe` ADD CONSTRAINT `validation_reparation_tpe_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `validation_reparation_tpe` ADD CONSTRAINT `validation_reparation_tpe_ibfk_2` FOREIGN KEY (`reparation_id`) REFERENCES `reparation_tpe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
