/*
  Warnings:

  - You are about to drop the column `date` on the `reception_piece` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `reception_piece` DROP COLUMN `date`,
    ADD COLUMN `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0);
