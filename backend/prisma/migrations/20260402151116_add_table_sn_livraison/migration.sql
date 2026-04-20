-- CreateTable
CREATE TABLE `sn_livraison` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serial_number` VARCHAR(255) NOT NULL,
    `point_marchand` VARCHAR(255) NULL,
    `caisse` VARCHAR(255) NULL,
    `mobile_money` VARCHAR(255) NULL,
    `banque` VARCHAR(255) NULL,
    `commentaire` VARCHAR(255) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `livraison_id` INTEGER NOT NULL,
    `updated_at` DATETIME(0) NULL,
    `last_modified_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `serial_number`(`serial_number`),
    INDEX `livraison_id`(`livraison_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sn_livraison` ADD CONSTRAINT `sn_livraison_ibfk_1` FOREIGN KEY (`livraison_id`) REFERENCES `livraison`(`id_livraison`) ON DELETE RESTRICT ON UPDATE CASCADE;
