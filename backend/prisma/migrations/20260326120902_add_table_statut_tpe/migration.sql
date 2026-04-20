/*
  Warnings:

  - You are about to drop the column `statut` on the `history_tpe` table. All the data in the column will be lost.
  - You are about to drop the column `statut` on the `parc_tpe` table. All the data in the column will be lost.
  - Added the required column `statut_id` to the `history_tpe` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statut_id` to the `parc_tpe` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `history_tpe` DROP COLUMN `statut`,
    ADD COLUMN `statut_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `parc_tpe` DROP COLUMN `statut`,
    ADD COLUMN `statut_id` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `statut_tpe` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `statut` VARCHAR(255) NOT NULL,

    INDEX `statut`(`statut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `statut_id` ON `history_tpe`(`statut_id`);

-- CreateIndex
CREATE INDEX `statut_id` ON `parc_tpe`(`statut_id`);

-- AddForeignKey
ALTER TABLE `parc_tpe` ADD CONSTRAINT `parc_tpe_ibfk_3` FOREIGN KEY (`statut_id`) REFERENCES `statut_tpe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `history_tpe` ADD CONSTRAINT `history_tpe_ibfk_5` FOREIGN KEY (`statut_id`) REFERENCES `statut_tpe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
