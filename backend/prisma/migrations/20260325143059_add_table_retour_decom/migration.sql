-- AlterTable
ALTER TABLE `forms` MODIFY `type` ENUM('livraison_sn', 'reception_sn', 'remplacement_sn', 'reception_remplacement', 'demande_stock', 'validation_stock', 'reception_stock', 'demande_qr', 'generation_qr', 'impression_qr', 'livraison_qr', 'reception_qr', 'reception_piece', 'livraison_stock', 'decom', 'reception_decom', 'retour_technique', 'retour_decom') NOT NULL;

-- CreateTable
CREATE TABLE `retour_decom` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `decom_id` INTEGER NOT NULL,

    INDEX `form_id`(`form_id`),
    INDEX `decom_id`(`decom_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `retour_decom` ADD CONSTRAINT `retour_decom_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retour_decom` ADD CONSTRAINT `retour_decom_ibfk_2` FOREIGN KEY (`decom_id`) REFERENCES `form_decom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
