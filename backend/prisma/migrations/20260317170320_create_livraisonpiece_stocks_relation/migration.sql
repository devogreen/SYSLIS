/*
  Warnings:

  - You are about to drop the column `piece_id` on the `livraison_piece` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `livraison_piece` DROP FOREIGN KEY `livraison_piece_ibfk_2`;

-- DropIndex
DROP INDEX `piece_id` ON `livraison_piece`;

-- AlterTable
ALTER TABLE `livraison_piece` DROP COLUMN `piece_id`,
    ADD COLUMN `stock_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `stock_id` ON `livraison_piece`(`stock_id`);

-- AddForeignKey
ALTER TABLE `livraison_piece` ADD CONSTRAINT `livraison_piece_ibfk_4` FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RedefineIndex
CREATE INDEX `form_id` ON `livraison_piece`(`form_id`);
