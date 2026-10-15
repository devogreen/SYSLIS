-- AlterTable
ALTER TABLE `form_decom` ADD COLUMN `is_remplacement` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `reception_decom` ADD COLUMN `liste_decom` LONGTEXT NULL,
    ADD COLUMN `quantite` INTEGER NULL;
