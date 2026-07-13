-- DropForeignKey
ALTER TABLE `pieces_a_reparer` DROP FOREIGN KEY `pieces_a_reparer_ibfk_1`;

-- CreateTable
CREATE TABLE `tpe_a_reparer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tpe_id` INTEGER NOT NULL,
    `nom_marchand` VARCHAR(191) NULL,
    `decom_id` INTEGER NULL,
    `etat` ENUM('defectueux', 'repare') NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NULL,
    `created_by` INTEGER NOT NULL,
    `updated_by` INTEGER NULL,

    INDEX `tpe_id`(`tpe_id`),
    INDEX `decom_id`(`decom_id`),
    INDEX `created_by`(`created_by`),
    INDEX `updated_by`(`updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tpe_a_reparer` ADD CONSTRAINT `tpe_a_reparer_ibfk_1` FOREIGN KEY (`tpe_id`) REFERENCES `parc_tpe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tpe_a_reparer` ADD CONSTRAINT `tpe_a_reparer_ibfk_2` FOREIGN KEY (`decom_id`) REFERENCES `form_decom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tpe_a_reparer` ADD CONSTRAINT `tpe_a_reparer_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users`(`id_user`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tpe_a_reparer` ADD CONSTRAINT `tpe_a_reparer_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pieces_a_reparer` ADD CONSTRAINT `pieces_a_reparer_ibfk_1` FOREIGN KEY (`sn_id`) REFERENCES `tpe_a_reparer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
