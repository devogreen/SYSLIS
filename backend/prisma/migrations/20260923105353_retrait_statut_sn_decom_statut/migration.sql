/*
  Warnings:

  - The values [attente_checking] on the enum `retour_technique_statut` will be removed. If these variants are still used in the database, this will fail.
  - The values [attente_checking] on the enum `retour_technique_statut` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `retour_technique` MODIFY `statut` ENUM('parametrage', 'rebus', 'checking', 'a_reparer') NOT NULL DEFAULT 'checking';

-- AlterTable
ALTER TABLE `sn_decom` MODIFY `statut` ENUM('parametrage', 'rebus', 'checking', 'a_reparer') NOT NULL DEFAULT 'checking';
