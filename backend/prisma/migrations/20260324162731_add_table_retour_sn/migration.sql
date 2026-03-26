/*
  Warnings:

  - You are about to drop the column `retour_id` on the `sn_decom` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `sn_decom` DROP FOREIGN KEY `sn_decom_ibfk_2`;

-- DropIndex
DROP INDEX `retour_id` ON `sn_decom`;

-- AlterTable
ALTER TABLE `sn_decom` DROP COLUMN `retour_id`,
    ADD COLUMN `banque` VARCHAR(255) NULL;

-- CreateTable
CREATE TABLE `retour_sn` (
    `sn_id` INTEGER NOT NULL,
    `retour_id` INTEGER NOT NULL,

    INDEX `sn_id`(`sn_id`),
    INDEX `retour_id`(`retour_id`),
    PRIMARY KEY (`sn_id`, `retour_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `retour_sn` ADD CONSTRAINT `retour_sn_ibfk_1` FOREIGN KEY (`sn_id`) REFERENCES `sn_decom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retour_sn` ADD CONSTRAINT `retour_sn_ibfk_2` FOREIGN KEY (`retour_id`) REFERENCES `retour_technique`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
