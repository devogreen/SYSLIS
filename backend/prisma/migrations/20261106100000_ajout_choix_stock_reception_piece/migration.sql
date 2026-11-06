-- AlterTable
ALTER TABLE `reception_piece` ADD COLUMN `action_stock` ENUM('nouveau_stock', 'stock_existant', 'ignore') NULL,
    ADD COLUMN `stock_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `stock_id` ON `reception_piece`(`stock_id`);

-- AddForeignKey
ALTER TABLE `reception_piece` ADD CONSTRAINT `reception_piece_ibfk_5` FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
