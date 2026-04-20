/*
  Warnings:

  - You are about to drop the `retour_sn` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `sn_id` to the `retour_technique` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `retour_sn` DROP FOREIGN KEY `retour_sn_ibfk_1`;

-- DropForeignKey
ALTER TABLE `retour_sn` DROP FOREIGN KEY `retour_sn_ibfk_2`;

-- AlterTable
ALTER TABLE `retour_technique` ADD COLUMN `sn_id` INTEGER NOT NULL;

-- DropTable
DROP TABLE `retour_sn`;

-- CreateIndex
CREATE INDEX `sn_id` ON `retour_technique`(`sn_id`);

-- AddForeignKey
ALTER TABLE `retour_technique` ADD CONSTRAINT `retour_technique_ibfk4` FOREIGN KEY (`sn_id`) REFERENCES `sn_decom`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;
