-- AlterTable
ALTER TABLE `form_decom` MODIFY `statut` ENUM('en_cours', 'retourne', 'recu', 'verifie_decom', 'valide_decom', 'transmis_decom', 'verification', 'complet', 'clos', 'transmis_decom_param', 'reception_decom_param', 'decom_en_reparation', 'decom_repare', 'transmis_decom_repare', 'receptionne_decom_repare') NOT NULL;

-- AlterTable
ALTER TABLE `forms` MODIFY `type` ENUM('livraison_sn', 'reception_sn', 'remplacement_sn', 'reception_remplacement', 'demande_stock', 'validation_stock', 'reception_stock', 'demande_qr', 'generation_qr', 'impression_qr', 'livraison_qr', 'reception_qr', 'reception_piece', 'livraison_stock', 'decom', 'reception_decom', 'retour_technique', 'retour_decom', 'demande_rebut', 'validation_rebut', 'livraison_tpe_repare', 'reception_tpe_repare', 'reparation_tpe', 'mise_en_reparation', 'retour_demande_qr', 'livraison_param_decom', 'reception_param_decom') NOT NULL;

-- CreateTable
CREATE TABLE `livraison_param_decom` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `decom_id` INTEGER NULL,
    `statut` ENUM('en_cours', 'livre', 'clos', 'annule') NOT NULL,
    `quantite` INTEGER NULL,
    `liste_sn` LONGTEXT NULL,

    INDEX `form_id`(`form_id`),
    INDEX `decom_id`(`decom_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reception_param_decom` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `livraison_id` INTEGER NOT NULL,
    `type` ENUM('reception', 'cloture') NOT NULL,
    `quantite` INTEGER NULL,
    `liste_sn` LONGTEXT NULL,

    INDEX `form_id`(`form_id`),
    INDEX `livraison_id`(`livraison_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `livraison_param_decom` ADD CONSTRAINT `livraison_param_decom_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `livraison_param_decom` ADD CONSTRAINT `livraison_param_decom_ibfk_2` FOREIGN KEY (`decom_id`) REFERENCES `form_decom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception_param_decom` ADD CONSTRAINT `reception_param_decom_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception_param_decom` ADD CONSTRAINT `reception_param_decom_ibfk_2` FOREIGN KEY (`livraison_id`) REFERENCES `livraison_param_decom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
