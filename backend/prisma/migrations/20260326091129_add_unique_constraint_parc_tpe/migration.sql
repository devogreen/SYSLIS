/*
  Warnings:

  - A unique constraint covering the columns `[serial_number]` on the table `parc_tpe` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `serial_number` ON `parc_tpe`;

-- CreateIndex
CREATE UNIQUE INDEX `parc_tpe_serial_number_key` ON `parc_tpe`(`serial_number`);
