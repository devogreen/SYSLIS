/*
  Warnings:

  - You are about to drop the column `created_at` on the `history_piece_rebut` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `history_piece_rebut` table. All the data in the column will be lost.
  - You are about to drop the column `sn_id` on the `history_piece_rebut` table. All the data in the column will be lost.
  - You are about to drop the column `sn_id` on the `mouvement_piece_rebut` table. All the data in the column will be lost.
  - You are about to drop the column `model_id` on the `sn_rebut` table. All the data in the column will be lost.
  - Added the required column `state_id` to the `history_piece_rebut` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rebut_id` to the `mouvement_piece_rebut` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `history_piece_rebut` DROP FOREIGN KEY `history_piece_rebut_ibfk_1`;

-- DropForeignKey
ALTER TABLE `history_piece_rebut` DROP FOREIGN KEY `history_piece_rebut_ibfk_3`;

-- DropForeignKey
ALTER TABLE `mouvement_piece_rebut` DROP FOREIGN KEY `mouvement_piece_rebut_ibfk_1`;

-- DropForeignKey
ALTER TABLE `sn_rebut` DROP FOREIGN KEY `sn_rebut_ibfk_7`;

-- DropIndex
DROP INDEX `created_by` ON `history_piece_rebut`;

-- DropIndex
DROP INDEX `sn_id` ON `history_piece_rebut`;

-- DropIndex
DROP INDEX `sn_id` ON `mouvement_piece_rebut`;

-- DropIndex
DROP INDEX `model_id` ON `sn_rebut`;

-- AlterTable
ALTER TABLE `history_piece_rebut` DROP COLUMN `created_at`,
    DROP COLUMN `created_by`,
    DROP COLUMN `sn_id`,
    ADD COLUMN `state_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `mouvement_piece_rebut` DROP COLUMN `sn_id`,
    ADD COLUMN `rebut_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `sn_rebut` DROP COLUMN `model_id`;

-- CreateTable
CREATE TABLE `history_state_piece_rebut` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rebut_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_by` INTEGER NOT NULL,

    INDEX `rebut_id`(`rebut_id`),
    INDEX `created_by`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `state_id` ON `history_piece_rebut`(`state_id`);

-- CreateIndex
CREATE INDEX `rebut_id` ON `mouvement_piece_rebut`(`rebut_id`);

-- AddForeignKey
ALTER TABLE `history_state_piece_rebut` ADD CONSTRAINT `history_state_piece_rebut_ibfk_1` FOREIGN KEY (`rebut_id`) REFERENCES `sn_rebut`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `history_state_piece_rebut` ADD CONSTRAINT `history_state_piece_rebut_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `history_piece_rebut` ADD CONSTRAINT `history_piece_rebut_ibfk_1` FOREIGN KEY (`state_id`) REFERENCES `history_state_piece_rebut`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mouvement_piece_rebut` ADD CONSTRAINT `mouvement_piece_rebut_ibfk_1` FOREIGN KEY (`rebut_id`) REFERENCES `sn_rebut`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
