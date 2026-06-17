/*
  Warnings:

  - Added the required column `model_id` to the `sn_rebut` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `sn_rebut` ADD COLUMN `model_id` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `model_id` ON `sn_rebut`(`model_id`);

-- AddForeignKey
ALTER TABLE `sn_rebut` ADD CONSTRAINT `sn_rebut_ibfk_7` FOREIGN KEY (`model_id`) REFERENCES `model_piece`(`id_model`) ON DELETE RESTRICT ON UPDATE CASCADE;
