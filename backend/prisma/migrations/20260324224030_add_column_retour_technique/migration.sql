/*
  Warnings:

  - You are about to drop the column `liste_decom` on the `retour_technique` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `retour_technique` DROP COLUMN `liste_decom`,
    ADD COLUMN `commentaire_retour` LONGTEXT NULL;
