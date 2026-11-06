-- CreateTable
CREATE TABLE `verrous_applicatifs` (
    `nom` VARCHAR(64) NOT NULL,
    `maj` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`nom`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Ligne du verrou d'unicité des codes de stock
INSERT INTO `verrous_applicatifs` (`nom`, `maj`) VALUES ('code_stock', CURRENT_TIMESTAMP(0));

-- CreateIndex
CREATE INDEX `code_stock` ON `stocks`(`code_stock`);
