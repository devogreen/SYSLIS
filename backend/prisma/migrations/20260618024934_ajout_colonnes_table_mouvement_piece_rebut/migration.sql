/*
  Warnings:

  - You are about to drop the column `reste_pieces_defectueuses` on the `mouvement_piece_rebut` table. All the data in the column will be lost.
  - You are about to drop the column `reste_pieces_fonctionnelles` on the `mouvement_piece_rebut` table. All the data in the column will be lost.
  - Added the required column `nouvel_etat` to the `mouvement_piece_rebut` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `mouvement_piece_rebut` DROP COLUMN `reste_pieces_defectueuses`,
    DROP COLUMN `reste_pieces_fonctionnelles`,
    ADD COLUMN `ancien_etat` ENUM('fonctionnel', 'defectueux', 'utilise') NULL,
    ADD COLUMN `nouvel_etat` ENUM('fonctionnel', 'defectueux', 'utilise') NOT NULL;
