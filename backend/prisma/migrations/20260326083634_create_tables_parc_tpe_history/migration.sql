-- CreateTable
CREATE TABLE `parc_tpe` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serial_number` VARCHAR(255) NOT NULL,
    `created_by` INTEGER NOT NULL,
    `updated_by` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NULL,
    `last_modified_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `statut` ENUM('neuf', 'back_office', 'decom', 'parametrage', 'rebut') NOT NULL,

    INDEX `created_by`(`created_by`),
    INDEX `updated_by`(`updated_by`),
    INDEX `serial_number`(`serial_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `history_tpe` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_tpe` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_by` INTEGER NULL,
    `statut` ENUM('neuf', 'back_office', 'decom', 'parametrage', 'rebut') NOT NULL,
    `form_id` INTEGER NULL,
    `stock_id` INTEGER NULL,

    INDEX `created_by`(`created_by`),
    INDEX `form_id`(`form_id`),
    INDEX `stock_id`(`stock_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `parc_tpe` ADD CONSTRAINT `parc_tpe_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parc_tpe` ADD CONSTRAINT `parc_tpe_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `history_tpe` ADD CONSTRAINT `history_tpe_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `history_tpe` ADD CONSTRAINT `history_tpe_ibfk_2` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `history_tpe` ADD CONSTRAINT `history_tpe_ibfk_3` FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
