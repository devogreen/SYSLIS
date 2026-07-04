-- AlterTable
ALTER TABLE `forms` MODIFY `type` ENUM('livraison_sn', 'reception_sn', 'remplacement_sn', 'reception_remplacement', 'demande_stock', 'validation_stock', 'reception_stock', 'demande_qr', 'generation_qr', 'impression_qr', 'livraison_qr', 'reception_qr', 'reception_piece', 'livraison_stock', 'decom', 'reception_decom', 'retour_technique', 'retour_decom', 'demande_rebut', 'validation_rebut', 'livraison_tpe_repare', 'reception_tpe_repare', 'reparation_tpe') NOT NULL;

-- CreateTable
CREATE TABLE `pieces_a_reparer` (
    `sn_id` INTEGER NOT NULL,
    `piece_id` INTEGER NOT NULL,
    `etat` ENUM('defectueux', 'repare') NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NULL,
    `created_by` INTEGER NOT NULL,
    `updated_by` INTEGER NULL,

    INDEX `sn_id`(`sn_id`),
    INDEX `piece_id`(`piece_id`),
    PRIMARY KEY (`sn_id`, `piece_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mouvement_piece_a_reparer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `piece_id` INTEGER NOT NULL,
    `reparation_id` INTEGER NOT NULL,
    `ancien_etat` ENUM('defectueux', 'repare') NULL,
    `nouvel_etat` ENUM('defectueux', 'repare') NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_by` INTEGER NOT NULL,

    INDEX `piece_id`(`piece_id`),
    INDEX `reparation_id`(`reparation_id`),
    INDEX `created_by`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reparation_tpe` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `quantite` INTEGER NULL,
    `liste_sn` LONGTEXT NULL,

    INDEX `form_id`(`form_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `livraison_tpe_repare` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `reparation_id` INTEGER NULL,
    `statut` ENUM('en_cours', 'livre', 'retourne', 'annule') NOT NULL,
    `quantite` INTEGER NULL,
    `liste_sn` LONGTEXT NULL,

    INDEX `form_id`(`form_id`),
    INDEX `reparation_id`(`reparation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reception_tpe_repare` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `livraison_id` INTEGER NOT NULL,
    `type` ENUM('reception', 'retour') NOT NULL,
    `quantite` INTEGER NULL,
    `liste_sn` LONGTEXT NULL,

    INDEX `form_id`(`form_id`),
    INDEX `livraison_id`(`livraison_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pieces_a_reparer` ADD CONSTRAINT `pieces_a_reparer_ibfk_1` FOREIGN KEY (`sn_id`) REFERENCES `parc_tpe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pieces_a_reparer` ADD CONSTRAINT `pieces_a_reparer_ibfk_2` FOREIGN KEY (`piece_id`) REFERENCES `items`(`id_piece`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pieces_a_reparer` ADD CONSTRAINT `pieces_a_reparer_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users`(`id_user`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pieces_a_reparer` ADD CONSTRAINT `pieces_a_reparer_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mouvement_piece_a_reparer` ADD CONSTRAINT `mouvement_piece_a_reparer_ibfk_1` FOREIGN KEY (`reparation_id`) REFERENCES `reparation_tpe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mouvement_piece_a_reparer` ADD CONSTRAINT `mouvement_piece_a_reparer_ibfk_2` FOREIGN KEY (`piece_id`) REFERENCES `items`(`id_piece`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mouvement_piece_a_reparer` ADD CONSTRAINT `mouvement_piece_a_reparer_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reparation_tpe` ADD CONSTRAINT `reparation_tpe_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `livraison_tpe_repare` ADD CONSTRAINT `livraison_tpe_repare_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception_tpe_repare` ADD CONSTRAINT `reception_tpe_repare_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception_tpe_repare` ADD CONSTRAINT `reception_tpe_repare_ibfk_2` FOREIGN KEY (`livraison_id`) REFERENCES `livraison_tpe_repare`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
