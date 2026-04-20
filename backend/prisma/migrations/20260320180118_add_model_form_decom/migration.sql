-- CreateTable
CREATE TABLE `form_decom` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `statut` ENUM('en_cours', 'retourne', 'recu', 'clos') NOT NULL,
    `quantite` INTEGER NULL,
    `liste_decom` LONGTEXT NULL,

    INDEX `form_id`(`form_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `form_decom` ADD CONSTRAINT `form_decom_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
