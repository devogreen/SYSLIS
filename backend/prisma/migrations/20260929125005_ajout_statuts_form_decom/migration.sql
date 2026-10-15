-- AlterTable
ALTER TABLE `form_decom` MODIFY `statut` ENUM('en_cours', 'retourne', 'recu', 'verifie_decom', 'valide_decom', 'transmis_decom', 'verification', 'complet', 'clos', 'transmis_decom_param', 'decom_en_reparation', 'decom_repare', 'transmis_decom_repare', 'receptionne_decom_repare') NOT NULL;
