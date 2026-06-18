/*
  Warnings:

  - You are about to drop the column `state_id` on the `history_piece_rebut` table. All the data in the column will be lost.
  - You are about to drop the `history_state_piece_rebut` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `snap_id` to the `history_piece_rebut` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `history_piece_rebut` DROP FOREIGN KEY `history_piece_rebut_ibfk_1`;

-- DropForeignKey
ALTER TABLE `history_state_piece_rebut` DROP FOREIGN KEY `history_state_piece_rebut_ibfk_1`;

-- DropForeignKey
ALTER TABLE `history_state_piece_rebut` DROP FOREIGN KEY `history_state_piece_rebut_ibfk_2`;

-- DropIndex
DROP INDEX `state_id` ON `history_piece_rebut`;

-- AlterTable
ALTER TABLE `history_piece_rebut` DROP COLUMN `state_id`,
    ADD COLUMN `snap_id` INTEGER NOT NULL;

-- DropTable
DROP TABLE `history_state_piece_rebut`;

-- CreateTable
CREATE TABLE `history_snapshot_piece_rebut` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rebut_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_by` INTEGER NOT NULL,

    INDEX `rebut_id`(`rebut_id`),
    INDEX `created_by`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `snap_id` ON `history_piece_rebut`(`snap_id`);

-- AddForeignKey
ALTER TABLE `history_snapshot_piece_rebut` ADD CONSTRAINT `history_snapshot_piece_rebut_ibfk_1` FOREIGN KEY (`rebut_id`) REFERENCES `sn_rebut`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `history_snapshot_piece_rebut` ADD CONSTRAINT `history_snapshot_piece_rebut_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `history_piece_rebut` ADD CONSTRAINT `history_piece_rebut_ibfk_1` FOREIGN KEY (`snap_id`) REFERENCES `history_snapshot_piece_rebut`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
