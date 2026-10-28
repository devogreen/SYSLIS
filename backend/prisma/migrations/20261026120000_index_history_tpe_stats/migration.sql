-- Index composites pour le dashboard statistiques parc TPE
-- (requetes par statut sur une periode, et historique ordonne par TPE)
CREATE INDEX `history_tpe_statut_date_idx` ON `history_tpe`(`statut_id`, `created_at`);

CREATE INDEX `history_tpe_tpe_date_idx` ON `history_tpe`(`id_tpe`, `created_at`);
