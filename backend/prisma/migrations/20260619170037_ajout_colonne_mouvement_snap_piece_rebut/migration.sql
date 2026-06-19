/*
  Warnings:

  - Added the required column `snap_id` to the `mouvement_piece_rebut` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `mouvement_piece_rebut` ADD COLUMN `snap_id` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `snap_id` ON `mouvement_piece_rebut`(`snap_id`);

-- AddForeignKey
ALTER TABLE `mouvement_piece_rebut` ADD CONSTRAINT `mouvement_piece_rebut_ibfk_4` FOREIGN KEY (`snap_id`) REFERENCES `history_snapshot_piece_rebut`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
