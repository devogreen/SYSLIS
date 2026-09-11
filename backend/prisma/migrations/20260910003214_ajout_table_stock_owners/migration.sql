-- CreateTable
CREATE TABLE `stock_owners` (
    `user_id` INTEGER NOT NULL,
    `stock_id` INTEGER NOT NULL,
    `type` ENUM('owner', 'sub_owner') NOT NULL,

    INDEX `user_id`(`user_id`),
    INDEX `stock_id`(`stock_id`),
    PRIMARY KEY (`user_id`, `stock_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `stock_owners` ADD CONSTRAINT `stock_owners_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_owners` ADD CONSTRAINT `stock_owners_ibfk_2` FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
