-- Version de session des comptes : incrémentée au changement de mot de passe, de droits, à la suppression
-- et à la déconnexion. Un JWT dont la version ne correspond plus est refusé.
ALTER TABLE `users` ADD COLUMN `token_version` INTEGER NOT NULL DEFAULT 0;
