-- CreateTable
CREATE TABLE `Livraisons` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `quantite_livraison` INTEGER NOT NULL,
    `nom_livreur` VARCHAR(255) NULL,
    `commentaire_livraison` LONGTEXT NULL,
    `signature_expediteur` VARCHAR(255) NULL,
    `files` LONGTEXT NULL,
    `type` ENUM('livraison_piece', 'livraison_commerciale') NOT NULL,
    `statut_livraison` ENUM('en_cours', 'livre', 'retourne', 'refuse', 'annule') NOT NULL,
    `role_id` INTEGER NULL,
    `service_id` INTEGER NULL,
    `date_livraison` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `autres_champs_livraison` LONGTEXT NULL,

    INDEX `role_id`(`role_id`),
    INDEX `service_id`(`service_id`),
    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `demandes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom_demandeur` VARCHAR(255) NULL,
    `date_demande` DATETIME(0) NOT NULL,
    `commentaire` TEXT NULL,
    `qte_total_demande` INTEGER NOT NULL,
    `nomenclature` VARCHAR(255) NULL,
    `details_demande` LONGTEXT NULL,
    `details_demandeur` LONGTEXT NULL,
    `statut_demande` ENUM('en_cours', 'valide', 'partiel', 'retourne', 'refuse') NOT NULL,
    `user_id` INTEGER NULL,
    `stock_id` INTEGER NULL,
    `item_id` INTEGER NULL,
    `type_demande` INTEGER NULL,
    `role_id_recepteur` INTEGER NULL,
    `demande_livree` BOOLEAN NOT NULL DEFAULT false,
    `demande_recue` BOOLEAN NOT NULL DEFAULT false,
    `id_demandeur` INTEGER NULL,
    `motif_demande` VARCHAR(255) NULL,
    `service_demandeur` INTEGER NULL,
    `champs_autre` LONGTEXT NULL,
    `files` LONGTEXT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `id_demandeur`(`id_demandeur`),
    INDEX `role_id_recepteur`(`role_id_recepteur`),
    INDEX `service_demandeur`(`service_demandeur`),
    INDEX `user_id`(`user_id`),
    INDEX `stock_id`(`stock_id`),
    INDEX `type_demande`(`type_demande`),
    INDEX `item_id`(`item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `items` (
    `id_piece` INTEGER NOT NULL AUTO_INCREMENT,
    `nom_piece` VARCHAR(255) NOT NULL,
    `type` ENUM('TERMINAL', 'PIECE') NULL,
    `created_at` DATETIME(0) NULL,
    `created_by` VARCHAR(255) NULL,
    `user_id` INTEGER NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id_piece`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `items_models` (
    `item_id` INTEGER NOT NULL,
    `model_id` INTEGER NOT NULL,

    INDEX `model_id`(`model_id`),
    PRIMARY KEY (`item_id`, `model_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `items_services` (
    `item_id` INTEGER NOT NULL,
    `service_id` INTEGER NOT NULL,

    INDEX `service_id`(`service_id`),
    PRIMARY KEY (`item_id`, `service_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `livraison` (
    `id_livraison` INTEGER NOT NULL AUTO_INCREMENT,
    `statut_livraison` ENUM('en_cours', 'livre', 'en_attente', 'refuse') NOT NULL DEFAULT 'en_cours',
    `qte_totale_livraison` INTEGER NOT NULL,
    `produitsLivre` LONGTEXT NOT NULL,
    `commentaire` LONGTEXT NULL,
    `date_livraison` DATETIME(0) NOT NULL,
    `deleted` BOOLEAN NOT NULL DEFAULT false,
    `date_deleted` DATETIME(0) NULL,
    `user_id` INTEGER NULL,
    `signature_expediteur` VARCHAR(255) NOT NULL,
    `nom_livreur` VARCHAR(255) NULL,
    `type_livraison_id` INTEGER NULL,
    `service_id` INTEGER NULL,
    `role_id` INTEGER NULL,
    `model_id` INTEGER NULL,
    `stock_id` INTEGER NULL,

    INDEX `model_id`(`model_id`),
    INDEX `role_id`(`role_id`),
    INDEX `service_id`(`service_id`),
    INDEX `type_livraison_id`(`type_livraison_id`),
    INDEX `user_id`(`user_id`),
    INDEX `stock_id`(`stock_id`),
    PRIMARY KEY (`id_livraison`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `livraison_piece` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `piece_id` INTEGER NOT NULL,
    `produits_livres` LONGTEXT NULL,
    `demande_id` INTEGER NULL,

    INDEX `piece_id`(`piece_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `model_piece` (
    `id_model` INTEGER NOT NULL AUTO_INCREMENT,
    `nom_model` VARCHAR(255) NULL,

    PRIMARY KEY (`id_model`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mouvement_stock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('entree', 'sortie') NOT NULL,
    `mouvement` INTEGER NULL,
    `formulaire_id` INTEGER NULL,
    `demande_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `stock_id` INTEGER NULL,
    `piece_id` INTEGER NOT NULL,
    `service_origine` INTEGER NULL,
    `service_destination` INTEGER NULL,
    `origine` VARCHAR(255) NULL,
    `destination` VARCHAR(255) NULL,
    `model_id` INTEGER NOT NULL,
    `stock_initial` INTEGER NULL,
    `quantite` INTEGER NULL,
    `stock_final` INTEGER NULL,
    `quantite_totale_piece` INTEGER NULL,
    `motif` TEXT NULL,
    `commentaire` LONGTEXT NULL,
    `details_mouvement` LONGTEXT NULL,

    INDEX `demande_id`(`demande_id`),
    INDEX `formulaire_id`(`formulaire_id`),
    INDEX `model_id`(`model_id`),
    INDEX `mouvement`(`mouvement`),
    INDEX `piece_id`(`piece_id`),
    INDEX `service_destination`(`service_destination`),
    INDEX `service_origine`(`service_origine`),
    INDEX `stock_id`(`stock_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reception_livraison` (
    `id_reception` INTEGER NOT NULL AUTO_INCREMENT,
    `livraison_id` INTEGER NOT NULL,
    `date_reception` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `user_id` INTEGER NOT NULL,
    `nom_recepteur` VARCHAR(255) NULL,
    `commentaire_reception` LONGTEXT NULL,
    `signature_recepteur` VARCHAR(255) NULL,
    `statut_reception` ENUM('recu', 'retourne', 'refuse') NOT NULL,

    INDEX `livraison_id`(`livraison_id`),
    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id_reception`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `remplacements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantite` INTEGER NOT NULL,
    `details_remplacement` LONGTEXT NOT NULL,
    `commentaire` LONGTEXT NULL,
    `date_remplacement` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `user_id` INTEGER NOT NULL,
    `old_model_id` INTEGER NOT NULL,
    `new_model_id` INTEGER NOT NULL,
    `service_id` INTEGER NOT NULL,
    `role_id` INTEGER NOT NULL,
    `deleted` BOOLEAN NOT NULL DEFAULT false,
    `nom_livreur` VARCHAR(255) NULL,
    `signature_expediteur` VARCHAR(255) NULL,
    `details_parametrage` LONGTEXT NULL,
    `statut` ENUM('en_cours', 'livre', 'en_attente', 'refuse', 'annule') NOT NULL,

    INDEX `new_model_id`(`new_model_id`),
    INDEX `old_model_id`(`old_model_id`),
    INDEX `role_id`(`role_id`),
    INDEX `service_id`(`service_id`),
    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id_role` INTEGER NOT NULL AUTO_INCREMENT,
    `nom_role` VARCHAR(255) NULL,
    `description` LONGTEXT NULL,

    PRIMARY KEY (`id_role`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom_service` VARCHAR(255) NULL,
    `code_service` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_carton` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero_carton` INTEGER NULL,
    `nom_carton` VARCHAR(255) NULL,
    `stock_id` INTEGER NULL,
    `lot_id` INTEGER NULL,
    `numero_lot` INTEGER NULL,
    `piece_id` INTEGER NOT NULL,
    `service_id` INTEGER NOT NULL,
    `model_id` INTEGER NOT NULL,
    `quantite_piece_carton` INTEGER NULL,
    `quantite_totale_piece` INTEGER NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `lot_id`(`lot_id`),
    INDEX `model_id`(`model_id`),
    INDEX `piece_id`(`piece_id`),
    INDEX `service_id`(`service_id`),
    INDEX `stock_id`(`stock_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_lot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero_lot` INTEGER NULL,
    `nom_lot` VARCHAR(255) NULL,
    `stock_id` INTEGER NULL,
    `quantite_carton_lot` INTEGER NULL,
    `quantite_carton` INTEGER NOT NULL DEFAULT 0,
    `quantite_piece` INTEGER NOT NULL DEFAULT 0,
    `piece_id` INTEGER NOT NULL,
    `service_id` INTEGER NOT NULL,
    `model_id` INTEGER NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `model_id`(`model_id`),
    INDEX `piece_id`(`piece_id`),
    INDEX `service_id`(`service_id`),
    INDEX `stock_id`(`stock_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_piece` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `piece_id` INTEGER NOT NULL,
    `service_id` INTEGER NOT NULL,
    `model_id` INTEGER NOT NULL,
    `quantite` INTEGER NOT NULL DEFAULT 0,

    INDEX `model_id`(`model_id`),
    INDEX `piece_id`(`piece_id`),
    INDEX `service_id`(`service_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `type_demande` (
    `id_type_demande` INTEGER NOT NULL AUTO_INCREMENT,
    `nom_type_demande` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id_type_demande`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `type_livraison_commerciale` (
    `id_type_livraison` INTEGER NOT NULL AUTO_INCREMENT,
    `nom_type_livraison` VARCHAR(255) NULL,
    `created_by` VARCHAR(255) NULL,
    `user_id` INTEGER NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id_type_livraison`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `type_mouvement_stock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(255) NOT NULL,
    `titre` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `type_parametrage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom_parametrage` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `user_id` INTEGER NOT NULL,
    `role_id` INTEGER NOT NULL,

    INDEX `role_id`(`role_id`),
    PRIMARY KEY (`user_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_services` (
    `user_id` INTEGER NOT NULL,
    `service_id` INTEGER NOT NULL,

    INDEX `service_id`(`service_id`),
    PRIMARY KEY (`user_id`, `service_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id_user` INTEGER NOT NULL AUTO_INCREMENT,
    `fullname` VARCHAR(255) NULL,
    `username` VARCHAR(255) NULL,
    `password` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `reset_token` VARCHAR(255) NULL,
    `reset_expires` DATETIME(0) NULL,
    `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_deleted` TINYINT NULL DEFAULT 0,

    PRIMARY KEY (`id_user`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `validation_demande` (
    `id_validation_demande` INTEGER NOT NULL AUTO_INCREMENT,
    `nom_validateur` VARCHAR(255) NULL,
    `date_validation_demande` DATETIME(0) NOT NULL,
    `commentaire` LONGTEXT NULL,
    `signature` VARCHAR(255) NULL,
    `statut_validation_demande` ENUM('valide', 'refuse', 'partiel', 'retourne') NOT NULL,
    `id_user` INTEGER NULL,
    `id_demande` INTEGER NOT NULL,
    `quantite_validee` INTEGER NULL,
    `stock_id` INTEGER NULL,

    INDEX `id_demande`(`id_demande`),
    INDEX `id_user`(`id_user`),
    INDEX `stock_id`(`stock_id`),
    PRIMARY KEY (`id_validation_demande`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `validation_remplacement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `remplacement_id` INTEGER NOT NULL,
    `date_validation` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `user_id` INTEGER NOT NULL,
    `commentaire` LONGTEXT NULL,
    `nom_recepteur` VARCHAR(255) NULL,
    `signature` VARCHAR(255) NULL,

    INDEX `remplacement_id`(`remplacement_id`),
    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `validations` (
    `id_validation` INTEGER NOT NULL AUTO_INCREMENT,
    `livraison_id` INTEGER NOT NULL,
    `date_validation` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `etat_validation` ENUM('valide', 'partiel', 'refuse', 'retourne') NOT NULL DEFAULT 'valide',
    `commentaire` LONGTEXT NULL,
    `user_id` INTEGER NULL,
    `nom_recepteur` VARCHAR(255) NULL,
    `signature` VARCHAR(255) NULL,

    INDEX `livraison_id`(`livraison_id`),
    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id_validation`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stocks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code_stock` VARCHAR(255) NULL,
    `piece_id` INTEGER NOT NULL,
    `model_id` INTEGER NOT NULL,
    `service_id` INTEGER NOT NULL,
    `quantite_lot` INTEGER NULL,
    `quantite_carton` INTEGER NULL,
    `quantite_piece` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_by` INTEGER NULL,
    `last_update` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` INTEGER NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `created_by`(`created_by`),
    INDEX `model_id`(`model_id`),
    INDEX `piece_id`(`piece_id`),
    INDEX `service_id`(`service_id`),
    INDEX `updated_by`(`updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reception_piece` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `demande_id` INTEGER NULL,
    `date` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `signature_recepteur` VARCHAR(255) NULL,
    `nom_recepteur` VARCHAR(255) NULL,
    `commentaire` LONGTEXT NULL,

    INDEX `demande_id`(`demande_id`),
    INDEX `item_id`(`item_id`),
    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `serial_numbers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serial_number` VARCHAR(255) NOT NULL,
    `stock_id` INTEGER NULL,
    `lot_id` INTEGER NULL,
    `carton_id` INTEGER NULL,
    `item_id` INTEGER NOT NULL,
    `service_id` INTEGER NULL,
    `model_id` INTEGER NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `serial_number`(`serial_number`),
    INDEX `carton_id`(`carton_id`),
    INDEX `item_id`(`item_id`),
    INDEX `lot_id`(`lot_id`),
    INDEX `model_id`(`model_id`),
    INDEX `service_id`(`service_id`),
    INDEX `stock_id`(`stock_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fichiers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `path` VARCHAR(255) NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `originalName` VARCHAR(255) NULL,
    `mimeType` VARCHAR(255) NULL,
    `size` INTEGER NULL,
    `uploaded_by` INTEGER NOT NULL,
    `form_id` INTEGER NULL,
    `livraison_id` INTEGER NULL,
    `remplacement_id` INTEGER NULL,
    `demande_id` INTEGER NULL,
    `type_formulaire` ENUM('livraison', 'remplacement', 'demande', 'demande_qr') NOT NULL,
    `role` ENUM('livreur', 'receveur', 'demandeur', 'validateur', 'regularisateur', 'generateur') NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `demande_id`(`demande_id`),
    INDEX `livraison_id`(`livraison_id`),
    INDEX `remplacement_id`(`remplacement_id`),
    INDEX `uploaded_by`(`uploaded_by`),
    INDEX `form_id`(`form_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `types_formulaires` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom_formulaire` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `demande_qr` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `statut` ENUM('soumise', 'generee', 'imprimee', 'livree', 'recue') NOT NULL,
    `quantite_qr` INTEGER NULL,
    `quantite_marchand` INTEGER NOT NULL,
    `liste_demande` LONGTEXT NULL,
    `is_reg` BOOLEAN NOT NULL DEFAULT false,

    INDEX `form_id`(`form_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `form_signatures` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `signature_url` VARCHAR(255) NOT NULL,
    `signed_by` INTEGER NOT NULL,
    `signed_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `role` ENUM('livreur', 'receveur', 'demandeur', 'validateur', 'regularisateur') NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `signed_by`(`signed_by`),
    INDEX `form_id`(`form_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `generation_qr` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `quantite_qr` INTEGER NULL,
    `demande_id` INTEGER NOT NULL,

    INDEX `demande_id`(`demande_id`),
    INDEX `form_id`(`form_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `impression_qr` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `generation_id` INTEGER NOT NULL,
    `quantite_qr` INTEGER NULL,
    `demande_id` INTEGER NOT NULL,

    INDEX `demande_id`(`demande_id`),
    INDEX `form_id`(`form_id`),
    INDEX `generation_id`(`generation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `livraison_qr` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `demande_id` INTEGER NOT NULL,
    `quantite_qr` INTEGER NULL,

    INDEX `demande_id`(`demande_id`),
    INDEX `form_id`(`form_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marchands_qr` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chaine` VARCHAR(255) NULL,
    `nom_marchand` VARCHAR(255) NULL,
    `quantite_sn` INTEGER NULL,
    `quantite_qr` INTEGER NULL,
    `type_qr` VARCHAR(255) NULL,
    `type_id` INTEGER NULL,
    `format_id` INTEGER NOT NULL,
    `format` VARCHAR(255) NOT NULL,
    `demande_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `demande_id`(`demande_id`),
    INDEX `type_id`(`type_id`),
    INDEX `format_id`(`format_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qr_codes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `path` VARCHAR(255) NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `originalName` VARCHAR(255) NULL,
    `mimeType` VARCHAR(255) NULL,
    `size` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `uploaded_by` INTEGER NOT NULL,
    `demande_id` INTEGER NULL,
    `generation_id` INTEGER NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `demande_id`(`demande_id`),
    INDEX `uploaded_by`(`uploaded_by`),
    INDEX `generation_id`(`generation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reception_qr` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `demande_id` INTEGER NOT NULL,
    `livraison_id` INTEGER NOT NULL,
    `quantite_qr` INTEGER NULL,

    INDEX `demande_id`(`demande_id`),
    INDEX `livraison_id`(`livraison_id`),
    INDEX `form_id`(`form_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `type_paiement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(255) NOT NULL,
    `abrv` VARCHAR(255) NULL,
    `type` ENUM('mobile', 'bancaire') NOT NULL,
    `qr_code` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `forms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('livraison_sn', 'reception_sn', 'remplacement_sn', 'reception_remplacement', 'demande_stock', 'validation_stock', 'reception_stock', 'demande_qr', 'generation_qr', 'impression_qr', 'livraison_qr', 'reception_qr') NOT NULL,
    `created_by` INTEGER NOT NULL,
    `updated_by` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NULL,
    `last_modified_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `nom_user` VARCHAR(255) NULL,
    `commentaire` LONGTEXT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `created_by`(`created_by`),
    INDEX `updated_by`(`updated_by`),
    INDEX `type`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `format_qr` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `format` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Livraisons` ADD CONSTRAINT `Livraisons_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id_role`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Livraisons` ADD CONSTRAINT `Livraisons_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Livraisons` ADD CONSTRAINT `Livraisons_ibfk_4` FOREIGN KEY (`user_id`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `demandes` ADD CONSTRAINT `demandes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `demandes` ADD CONSTRAINT `demandes_ibfk_9` FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `demandes` ADD CONSTRAINT `demandes_ibfk_6` FOREIGN KEY (`item_id`) REFERENCES `items`(`id_piece`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `demandes` ADD CONSTRAINT `demandes_ibfk_10` FOREIGN KEY (`type_demande`) REFERENCES `type_mouvement_stock`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `demandes` ADD CONSTRAINT `demandes_ibfk_3` FOREIGN KEY (`role_id_recepteur`) REFERENCES `roles`(`id_role`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `demandes` ADD CONSTRAINT `demandes_ibfk_7` FOREIGN KEY (`id_demandeur`) REFERENCES `users`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `demandes` ADD CONSTRAINT `demandes_ibfk_8` FOREIGN KEY (`service_demandeur`) REFERENCES `services`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items` ADD CONSTRAINT `items_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items_models` ADD CONSTRAINT `items_models_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items`(`id_piece`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items_models` ADD CONSTRAINT `items_models_ibfk_2` FOREIGN KEY (`model_id`) REFERENCES `model_piece`(`id_model`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items_services` ADD CONSTRAINT `items_services_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items`(`id_piece`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items_services` ADD CONSTRAINT `items_services_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `livraison` ADD CONSTRAINT `livraison_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `livraison` ADD CONSTRAINT `livraison_ibfk_2` FOREIGN KEY (`type_livraison_id`) REFERENCES `type_livraison_commerciale`(`id_type_livraison`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `livraison` ADD CONSTRAINT `livraison_ibfk_3` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `livraison` ADD CONSTRAINT `livraison_ibfk_4` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id_role`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `livraison` ADD CONSTRAINT `livraison_ibfk_5` FOREIGN KEY (`model_id`) REFERENCES `model_piece`(`id_model`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `livraison` ADD CONSTRAINT `livraison_ibfk_6` FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `livraison_piece` ADD CONSTRAINT `livraison_piece_ibfk_2` FOREIGN KEY (`piece_id`) REFERENCES `items`(`id_piece`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `livraison_piece` ADD CONSTRAINT `livraison_piece_ibfk_1` FOREIGN KEY (`id`) REFERENCES `Livraisons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mouvement_stock` ADD CONSTRAINT `mouvement_stock_ibfk_7` FOREIGN KEY (`mouvement`) REFERENCES `type_mouvement_stock`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mouvement_stock` ADD CONSTRAINT `mouvement_stock_ibfk_4` FOREIGN KEY (`formulaire_id`) REFERENCES `livraison`(`id_livraison`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mouvement_stock` ADD CONSTRAINT `mouvement_stock_ibfk_3` FOREIGN KEY (`demande_id`) REFERENCES `demandes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mouvement_stock` ADD CONSTRAINT `mouvement_stock_ibfk_8` FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mouvement_stock` ADD CONSTRAINT `mouvement_stock_ibfk_5` FOREIGN KEY (`piece_id`) REFERENCES `items`(`id_piece`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mouvement_stock` ADD CONSTRAINT `mouvement_stock_ibfk_1` FOREIGN KEY (`service_origine`) REFERENCES `services`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mouvement_stock` ADD CONSTRAINT `mouvement_stock_ibfk_2` FOREIGN KEY (`service_destination`) REFERENCES `services`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mouvement_stock` ADD CONSTRAINT `mouvement_stock_ibfk_6` FOREIGN KEY (`model_id`) REFERENCES `model_piece`(`id_model`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception_livraison` ADD CONSTRAINT `reception_livraison_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception_livraison` ADD CONSTRAINT `reception_livraison_ibfk_1` FOREIGN KEY (`livraison_id`) REFERENCES `Livraisons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remplacements` ADD CONSTRAINT `remplacements_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remplacements` ADD CONSTRAINT `remplacements_ibfk_2` FOREIGN KEY (`old_model_id`) REFERENCES `model_piece`(`id_model`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remplacements` ADD CONSTRAINT `remplacements_ibfk_3` FOREIGN KEY (`new_model_id`) REFERENCES `model_piece`(`id_model`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remplacements` ADD CONSTRAINT `remplacements_ibfk_4` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remplacements` ADD CONSTRAINT `remplacements_ibfk_5` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id_role`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_carton` ADD CONSTRAINT `stock_carton_ibfk_5` FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_carton` ADD CONSTRAINT `stock_carton_ibfk_2` FOREIGN KEY (`lot_id`) REFERENCES `stock_lot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_carton` ADD CONSTRAINT `stock_carton_ibfk_1` FOREIGN KEY (`piece_id`) REFERENCES `items`(`id_piece`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_carton` ADD CONSTRAINT `stock_carton_ibfk_3` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_carton` ADD CONSTRAINT `stock_carton_ibfk_4` FOREIGN KEY (`model_id`) REFERENCES `model_piece`(`id_model`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_lot` ADD CONSTRAINT `stock_lot_ibfk_4` FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_lot` ADD CONSTRAINT `stock_lot_ibfk_1` FOREIGN KEY (`piece_id`) REFERENCES `items`(`id_piece`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_lot` ADD CONSTRAINT `stock_lot_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_lot` ADD CONSTRAINT `stock_lot_ibfk_3` FOREIGN KEY (`model_id`) REFERENCES `model_piece`(`id_model`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_piece` ADD CONSTRAINT `stock_piece_ibfk_1` FOREIGN KEY (`piece_id`) REFERENCES `items`(`id_piece`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_piece` ADD CONSTRAINT `stock_piece_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_piece` ADD CONSTRAINT `stock_piece_ibfk_3` FOREIGN KEY (`model_id`) REFERENCES `model_piece`(`id_model`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `type_livraison_commerciale` ADD CONSTRAINT `type_livraison_commerciale_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_ibfk_4` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id_role`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_services` ADD CONSTRAINT `user_services_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_services` ADD CONSTRAINT `user_services_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `validation_demande` ADD CONSTRAINT `validation_demande_ibfk_2` FOREIGN KEY (`id_user`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `validation_demande` ADD CONSTRAINT `validation_demande_ibfk_1` FOREIGN KEY (`id_demande`) REFERENCES `demandes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `validation_demande` ADD CONSTRAINT `validation_demande_ibfk_3` FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `validation_remplacement` ADD CONSTRAINT `validation_remplacement_ibfk_4` FOREIGN KEY (`remplacement_id`) REFERENCES `remplacements`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `validation_remplacement` ADD CONSTRAINT `validation_remplacement_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `validations` ADD CONSTRAINT `validations_ibfk_1` FOREIGN KEY (`livraison_id`) REFERENCES `livraison`(`id_livraison`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `validations` ADD CONSTRAINT `validations_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `stocks` ADD CONSTRAINT `stocks_ibfk_1` FOREIGN KEY (`piece_id`) REFERENCES `items`(`id_piece`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stocks` ADD CONSTRAINT `stocks_ibfk_2` FOREIGN KEY (`model_id`) REFERENCES `model_piece`(`id_model`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stocks` ADD CONSTRAINT `stocks_ibfk_3` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stocks` ADD CONSTRAINT `stocks_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stocks` ADD CONSTRAINT `stocks_ibfk_5` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception_piece` ADD CONSTRAINT `reception_piece_ibfk_3` FOREIGN KEY (`demande_id`) REFERENCES `demandes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception_piece` ADD CONSTRAINT `reception_piece_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items`(`id_piece`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception_piece` ADD CONSTRAINT `reception_piece_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users`(`id_user`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `serial_numbers` ADD CONSTRAINT `serial_numbers_ibfk_1` FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `serial_numbers` ADD CONSTRAINT `serial_numbers_ibfk_2` FOREIGN KEY (`lot_id`) REFERENCES `stock_lot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `serial_numbers` ADD CONSTRAINT `serial_numbers_ibfk_3` FOREIGN KEY (`carton_id`) REFERENCES `stock_carton`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `serial_numbers` ADD CONSTRAINT `serial_numbers_ibfk_5` FOREIGN KEY (`model_id`) REFERENCES `model_piece`(`id_model`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `serial_numbers` ADD CONSTRAINT `serial_numbers_ibfk_6` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fichiers` ADD CONSTRAINT `fichiers_ibfk_1` FOREIGN KEY (`livraison_id`) REFERENCES `livraison`(`id_livraison`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fichiers` ADD CONSTRAINT `fichiers_ibfk_4` FOREIGN KEY (`demande_id`) REFERENCES `demandes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fichiers` ADD CONSTRAINT `fichiers_ibfk_3` FOREIGN KEY (`remplacement_id`) REFERENCES `remplacements`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fichiers` ADD CONSTRAINT `fichiers_ibfk_5` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `demande_qr` ADD CONSTRAINT `demande_qr_ibfk_3` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `form_signatures` ADD CONSTRAINT `form_signatures_ibfk_2` FOREIGN KEY (`signed_by`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `form_signatures` ADD CONSTRAINT `form_signatures_ibfk_3` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `generation_qr` ADD CONSTRAINT `generation_qr_ibfk_3` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `generation_qr` ADD CONSTRAINT `generation_qr_ibfk_2` FOREIGN KEY (`demande_id`) REFERENCES `demande_qr`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `impression_qr` ADD CONSTRAINT `impression_qr_ibfk_2` FOREIGN KEY (`demande_id`) REFERENCES `demande_qr`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `impression_qr` ADD CONSTRAINT `impression_qr_ibfk_3` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `impression_qr` ADD CONSTRAINT `impression_qr_ibfk_4` FOREIGN KEY (`generation_id`) REFERENCES `generation_qr`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `livraison_qr` ADD CONSTRAINT `livraison_qr_ibfk_3` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `livraison_qr` ADD CONSTRAINT `livraison_qr_ibfk_2` FOREIGN KEY (`demande_id`) REFERENCES `demande_qr`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marchands_qr` ADD CONSTRAINT `marchands_qr_ibfk_1` FOREIGN KEY (`demande_id`) REFERENCES `demande_qr`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marchands_qr` ADD CONSTRAINT `marchands_qr_ibfk_3` FOREIGN KEY (`format_id`) REFERENCES `format_qr`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marchands_qr` ADD CONSTRAINT `marchands_qr_ibfk_2` FOREIGN KEY (`type_id`) REFERENCES `type_paiement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_codes` ADD CONSTRAINT `qr_codes_ibfk_1` FOREIGN KEY (`demande_id`) REFERENCES `demande_qr`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_codes` ADD CONSTRAINT `qr_codes_ibfk_3` FOREIGN KEY (`generation_id`) REFERENCES `generation_qr`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_codes` ADD CONSTRAINT `qr_codes_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception_qr` ADD CONSTRAINT `reception_qr_ibfk_2` FOREIGN KEY (`demande_id`) REFERENCES `demande_qr`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception_qr` ADD CONSTRAINT `reception_qr_ibfk_4` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `reception_qr` ADD CONSTRAINT `reception_qr_ibfk_3` FOREIGN KEY (`livraison_id`) REFERENCES `livraison_qr`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `forms` ADD CONSTRAINT `forms_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `forms` ADD CONSTRAINT `forms_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id_user`) ON DELETE SET NULL ON UPDATE RESTRICT;
