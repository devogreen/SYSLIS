/*
  Warnings:

  - Added the required column `retour_id` to the `retour_technique` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `retour_technique` ADD COLUMN `retour_id` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `retour_id` ON `retour_technique`(`retour_id`);

-- AddForeignKey
ALTER TABLE `retour_technique` ADD CONSTRAINT `retour_technique_ibfk3` FOREIGN KEY (`retour_id`) REFERENCES `retour_decom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
