/*
  Warnings:

  - You are about to drop the column `liste_demande` on the `generation_qr` table. All the data in the column will be lost.
  - You are about to drop the column `quantite_marchand` on the `generation_qr` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `forms` MODIFY `type` ENUM('livraison_sn', 'reception_sn', 'remplacement_sn', 'reception_remplacement', 'demande_stock', 'validation_stock', 'reception_stock', 'demande_qr', 'generation_qr', 'impression_qr', 'livraison_qr', 'reception_qr', 'reception_piece', 'livraison_stock', 'decom', 'reception_decom', 'retour_technique', 'retour_decom', 'demande_rebut', 'validation_rebut') NOT NULL;

-- AlterTable
ALTER TABLE `generation_qr` DROP COLUMN `liste_demande`,
    DROP COLUMN `quantite_marchand`;

-- AlterTable
ALTER TABLE `parc_tpe` ADD COLUMN `model_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `demande_rebut` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `statut` ENUM('en_cours', 'valide', 'retourne', 'refuse', 'clos') NOT NULL,
    `quantite` INTEGER NULL,
    `liste_rebut` LONGTEXT NULL,

    INDEX `form_id`(`form_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `validation_rebut` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `demande_id` INTEGER NOT NULL,
    `form_id` INTEGER NOT NULL,
    `type` ENUM('validation', 'retour', 'refus', 'cloture') NOT NULL,
    `quantite` INTEGER NULL,
    `liste_rebut` LONGTEXT NULL,

    INDEX `demande_id`(`demande_id`),
    INDEX `form_id`(`form_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sn_rebut` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sn_id` INTEGER NOT NULL,
    `rebut_id` INTEGER NULL,
    `decom_id` INTEGER NULL,
    `point_marchand` VARCHAR(255) NULL,
    `etat` VARCHAR(255) NULL,
    `commentaire` VARCHAR(255) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NULL,
    `last_modified_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,
    `pieces_recuperees` LONGTEXT NULL,
    `pieces_defectueuses` LONGTEXT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `rebut_id`(`rebut_id`),
    INDEX `decom_id`(`decom_id`),
    INDEX `created_by`(`created_by`),
    INDEX `updated_by`(`updated_by`),
    INDEX `sn_id`(`sn_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pieces_rebut` (
    `sn_id` INTEGER NOT NULL,
    `piece_id` INTEGER NOT NULL,
    `etat` ENUM('fonctionnel', 'defectueux', 'utilise') NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NULL,
    `created_by` INTEGER NOT NULL,
    `updated_by` INTEGER NULL,

    INDEX `sn_id`(`sn_id`),
    INDEX `piece_id`(`piece_id`),
    PRIMARY KEY (`sn_id`, `piece_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `history_piece_rebut` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sn_id` INTEGER NOT NULL,
    `piece_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_by` INTEGER NOT NULL,
    `etat` ENUM('fonctionnel', 'defectueux', 'utilise') NOT NULL,

    INDEX `sn_id`(`sn_id`),
    INDEX `piece_id`(`piece_id`),
    INDEX `created_by`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mouvement_piece_rebut` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sn_id` INTEGER NOT NULL,
    `piece_id` INTEGER NOT NULL,
    `reste_pieces_fonctionnelles` LONGTEXT NULL,
    `reste_pieces_defectueuses` LONGTEXT NULL,
    `mouvement` ENUM('ajout', 'retrait') NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_by` INTEGER NOT NULL,

    INDEX `sn_id`(`sn_id`),
    INDEX `piece_id`(`piece_id`),
    INDEX `created_by`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `model_id` ON `parc_tpe`(`model_id`);

-- AddForeignKey
ALTER TABLE `parc_tpe` ADD CONSTRAINT `parc_tpe_ibfk_4` FOREIGN KEY (`model_id`) REFERENCES `model_piece`(`id_model`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `demande_rebut` ADD CONSTRAINT `demande_rebut_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `validation_rebut` ADD CONSTRAINT `validation_rebut_ibfk_1` FOREIGN KEY (`demande_id`) REFERENCES `demande_rebut`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `validation_rebut` ADD CONSTRAINT `validation_rebut_ibfk_2` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sn_rebut` ADD CONSTRAINT `sn_rebut_ibfk_1` FOREIGN KEY (`rebut_id`) REFERENCES `demande_rebut`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sn_rebut` ADD CONSTRAINT `sn_rebut_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sn_rebut` ADD CONSTRAINT `sn_rebut_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sn_rebut` ADD CONSTRAINT `sn_rebut_ibfk_5` FOREIGN KEY (`sn_id`) REFERENCES `parc_tpe`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sn_rebut` ADD CONSTRAINT `sn_rebut_ibfk_6` FOREIGN KEY (`decom_id`) REFERENCES `form_decom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pieces_rebut` ADD CONSTRAINT `pieces_rebut_ibfk_1` FOREIGN KEY (`sn_id`) REFERENCES `parc_tpe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pieces_rebut` ADD CONSTRAINT `pieces_rebut_ibfk_2` FOREIGN KEY (`piece_id`) REFERENCES `items`(`id_piece`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pieces_rebut` ADD CONSTRAINT `pieces_rebut_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users`(`id_user`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pieces_rebut` ADD CONSTRAINT `pieces_rebut_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `history_piece_rebut` ADD CONSTRAINT `history_piece_rebut_ibfk_1` FOREIGN KEY (`sn_id`) REFERENCES `sn_rebut`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `history_piece_rebut` ADD CONSTRAINT `history_piece_rebut_ibfk_2` FOREIGN KEY (`piece_id`) REFERENCES `items`(`id_piece`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `history_piece_rebut` ADD CONSTRAINT `history_piece_rebut_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mouvement_piece_rebut` ADD CONSTRAINT `mouvement_piece_rebut_ibfk_1` FOREIGN KEY (`sn_id`) REFERENCES `parc_tpe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mouvement_piece_rebut` ADD CONSTRAINT `mouvement_piece_rebut_ibfk_2` FOREIGN KEY (`piece_id`) REFERENCES `items`(`id_piece`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mouvement_piece_rebut` ADD CONSTRAINT `mouvement_piece_rebut_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;
