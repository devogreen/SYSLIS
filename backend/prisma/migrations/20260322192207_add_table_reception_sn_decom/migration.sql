-- CreateTable
CREATE TABLE `reception_decom` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `decom_id` INTEGER NOT NULL,
    `type` ENUM('validation', 'retour') NOT NULL,

    INDEX `form_id`(`form_id`),
    INDEX `decom_id`(`decom_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sn_decom` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serial_number` VARCHAR(255) NOT NULL,
    `point_marchand` VARCHAR(255) NULL,
    `tid_gim` VARCHAR(255) NULL,
    `tid_ecobank` VARCHAR(255) NULL,
    `etat` VARCHAR(255) NULL,
    `ri` VARCHAR(255) NULL,
    `commercial` VARCHAR(255) NULL,
    `commentaire` VARCHAR(255) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `decom_id` INTEGER NOT NULL,

    INDEX `serial_number`(`serial_number`),
    INDEX `decom_id`(`decom_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reception_decom` ADD CONSTRAINT `reception_decom_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception_decom` ADD CONSTRAINT `reception_decom_ibfk_2` FOREIGN KEY (`decom_id`) REFERENCES `form_decom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sn_decom` ADD CONSTRAINT `sn_decom_ibfk_1` FOREIGN KEY (`decom_id`) REFERENCES `form_decom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
