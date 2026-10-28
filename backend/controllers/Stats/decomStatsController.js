// =====================================================================
//  Tableau de bord des décommissionnements (entonnoir par cohorte)
//
//  Cohorte = TPE entrés en décom sur la période (date de création du décom,
//  ou date de clôture du décom selon le paramètre `base`). Chaque TPE est
//  ensuite suivi dans son historique (history_tpe), jusqu'à aujourd'hui ou
//  jusqu'à son entrée dans un décom suivant, et classé dans UNE branche :
//
//    Paramétrage direct  -> livrés (back office ou remplacement)
//    À réparer           -> réparés -> retour en paramétrage -> livrés
//    Rebut               -> direct / après tentative de réparation
//    En cours            -> décom pas encore clôturé (diagnostic non décidé)
//
//  Unité = un passage en décom (un TPE présent dans 2 décoms de la période
//  compte 2 fois, chaque passage étant suivi séparément).
// =====================================================================
const { Prisma } = require('@prisma/client');
const prisma = require('../../prisma/client');

// ---- Statuts parc_tpe (table statut_tpe) ----
const STATUT_PARAMETRAGE = 4;
const STATUT_REBUT = 5;
const STATUT_BACK_OFFICE_LIVRE = 6;
const STATUT_REMPLACEMENT = 7;
const STATUT_ATTENTE_DECOM = 8;
const STATUT_REPARE = 10;
const STATUT_A_REPARER = 11;
const STATUT_PARAM_MAINTENANCE = 13;
const STATUT_DECOM_REMPLACEMENT = 16;
const STATUTS_ENTREE = [STATUT_ATTENTE_DECOM, STATUT_DECOM_REMPLACEMENT];
const STATUTS_LIVRE = [STATUT_BACK_OFFICE_LIVRE, STATUT_REMPLACEMENT];

// Statuts de form_decom à partir desquels le diagnostic est définitif
const DECOM_CLOTURE = [
    'clos', 'transmis_decom_param', 'reception_decom_param', 'decom_en_reparation',
    'decom_repare', 'transmis_decom_repare', 'receptionne_decom_repare',
];

// Diagnostic sn_decom / statut de clôture -> branche
const BRANCHE_DIAG = { parametrage: 'parametrage', a_reparer: 'reparation', rebus: 'rebut' };
const BRANCHE_STATUT = {
    [STATUT_PARAM_MAINTENANCE]: 'parametrage',
    [STATUT_PARAMETRAGE]: 'parametrage',
    [STATUT_A_REPARER]: 'reparation',
    [STATUT_REBUT]: 'rebut',
};

const BASES = ['creation', 'cloture'];
const TYPES = ['tous', 'standard', 'remplacement'];
const TAILLE_LOT = 5000;

// ---------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------
const parseDebut = (v) => {
    if (!v) return null;
    const d = new Date(String(v).length === 10 ? `${v}T00:00:00.000Z` : v);
    return Number.isNaN(d.getTime()) ? undefined : d;
};
const parseFin = (v) => {
    if (!v) return null;
    const d = new Date(String(v).length === 10 ? `${v}T23:59:59.999Z` : v);
    return Number.isNaN(d.getTime()) ? undefined : d;
};
const parseId = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : undefined;
};
const heures = (a, b) => (new Date(b) - new Date(a)) / 3600000;
const arrondi = (n) => (n === null || n === undefined ? null : Math.round(n * 10) / 10);
const mediane = (arr) => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const lots = (arr) => {
    const res = [];
    for (let i = 0; i < arr.length; i += TAILLE_LOT) res.push(arr.slice(i, i + TAILLE_LOT));
    return res;
};
const lireListe = (json) => {
    try {
        const liste = typeof json === 'string' ? JSON.parse(json) : json;
        return Array.isArray(liste) ? liste : [];
    } catch {
        return [];
    }
};
const texte = (v) => (v === undefined || v === null || v === '' ? null : String(v));

// Premier évènement d'historique (dans la fenêtre) dont le statut est dans `statuts`, après `apres`
const premier = (hist, statuts, apres) =>
    hist.find((h) => statuts.includes(h.statut_id) && h.date >= apres) || null;

// ---------------------------------------------------------------------
//  GET /api/stats/decom/entonnoir
//    from, to      : période (YYYY-MM-DD)
//    base          : creation (défaut) | cloture
//    type          : tous (défaut) | standard | remplacement
//    modelId       : modèle de TPE (optionnel)
//  -> { resume, delais, lignes }
// ---------------------------------------------------------------------
const getEntonnoirDecom = async (req, res) => {
    try {
        const depuis = parseDebut(req.query.from);
        const jusqua = parseFin(req.query.to);
        const base = BASES.includes(req.query.base) ? req.query.base : 'creation';
        const type = TYPES.includes(req.query.type) ? req.query.type : 'tous';
        const modelId = parseId(req.query.modelId);
        if (depuis === undefined || jusqua === undefined) return res.status(400).json({ message: 'Période invalide' });
        if (modelId === undefined) return res.status(400).json({ message: 'Modèle invalide' });

        const colonneDate = base === 'cloture' ? Prisma.sql`c.date_cloture` : Prisma.sql`f.created_at`;

        // 1. Décoms de la période
        const decoms = await prisma.$queryRaw`
            SELECT fd.id AS decom_id, fd.statut, fd.is_remplacement, fd.liste_decom,
                   f.id AS form_id, f.created_at AS date_creation, f.is_reg,
                   c.date_cloture
            FROM form_decom fd
            JOIN forms f ON f.id = fd.form_id AND f.is_deleted = 0
            LEFT JOIN (
                SELECT rd.decom_id, MIN(f2.created_at) AS date_cloture
                FROM retour_decom rd
                JOIN forms f2 ON f2.id = rd.form_id
                WHERE rd.type = 'cloture'
                GROUP BY rd.decom_id
            ) c ON c.decom_id = fd.id
            WHERE 1 = 1
            ${type === 'standard' ? Prisma.sql`AND fd.is_remplacement = 0` : Prisma.empty}
            ${type === 'remplacement' ? Prisma.sql`AND fd.is_remplacement = 1` : Prisma.empty}
            ${base === 'cloture' ? Prisma.sql`AND c.date_cloture IS NOT NULL` : Prisma.empty}
            ${depuis ? Prisma.sql`AND ${colonneDate} >= ${depuis}` : Prisma.empty}
            ${jusqua ? Prisma.sql`AND ${colonneDate} <= ${jusqua}` : Prisma.empty}
            ORDER BY f.created_at, fd.id`;

        if (!decoms.length) return res.status(200).json({ resume: resumeVide(), delais: {}, lignes: [] });

        // 2. TPE de chaque décom : liste du décom + lignes sn_decom (diagnostic, infos marchand)
        const decomIds = decoms.map((d) => d.decom_id);
        const snDecoms = [];
        for (const lot of lots(decomIds)) {
            snDecoms.push(...await prisma.$queryRaw`
                SELECT decom_id, serial_number, statut, banque, point_marchand
                FROM sn_decom
                WHERE is_deleted = 0 AND decom_id IN (${Prisma.join(lot)})`);
        }
        const snParDecom = new Map();
        for (const s of snDecoms) {
            if (!snParDecom.has(s.decom_id)) snParDecom.set(s.decom_id, new Map());
            snParDecom.get(s.decom_id).set(String(s.serial_number).trim(), s);
        }

        const passages = [];
        for (const d of decoms) {
            const membres = new Map(); // sn -> infos
            for (const item of lireListe(d.liste_decom)) {
                const sn = texte(item?.terminalSN)?.trim();
                if (sn && !membres.has(sn)) membres.set(sn, { banque: texte(item.banque), point_marchand: texte(item.pointMarchand), diag: null });
            }
            for (const [sn, s] of snParDecom.get(d.decom_id) || []) {
                const m = membres.get(sn) || {};
                membres.set(sn, {
                    banque: s.banque ?? m.banque ?? null,
                    point_marchand: s.point_marchand ?? m.point_marchand ?? null,
                    diag: s.statut || null,
                });
            }
            for (const [sn, m] of membres) passages.push({ decom: d, serial_number: sn, ...m });
        }

        // 3. Parc + modèles
        const sns = [...new Set(passages.map((p) => p.serial_number))];
        const parc = new Map();
        for (const lot of lots(sns)) {
            const rows = await prisma.$queryRaw`
                SELECT p.id, p.serial_number, p.model_id, p.statut_id, m.nom_model, st.statut
                FROM parc_tpe p
                LEFT JOIN model_piece m ON m.id_model = p.model_id
                LEFT JOIN statut_tpe st ON st.id = p.statut_id
                WHERE p.is_deleted = 0 AND p.serial_number IN (${Prisma.join(lot)})`;
            rows.forEach((r) => parc.set(r.serial_number, r));
        }

        // 4. Historique complet des TPE concernés
        const ids = [...new Set([...parc.values()].map((p) => p.id))];
        const histParTpe = new Map();
        for (const lot of lots(ids)) {
            const rows = await prisma.$queryRaw`
                SELECT id_tpe, statut_id, form_id, created_at
                FROM history_tpe
                WHERE id_tpe IN (${Prisma.join(lot)})
                ORDER BY id_tpe, created_at, id`;
            for (const r of rows) {
                if (!histParTpe.has(r.id_tpe)) histParTpe.set(r.id_tpe, []);
                histParTpe.get(r.id_tpe).push({ statut_id: Number(r.statut_id), form_id: r.form_id, date: new Date(r.created_at) });
            }
        }

        // 5. Classement de chaque passage
        const maintenant = new Date();
        const lignes = [];
        for (const p of passages) {
            const tpe = parc.get(p.serial_number) || null;
            if (modelId && (!tpe || tpe.model_id !== modelId)) continue;

            const d = p.decom;
            const creation = new Date(d.date_creation);
            const histComplet = tpe ? histParTpe.get(tpe.id) || [] : [];
            // Fenêtre : de la création du décom jusqu'à l'entrée dans un décom suivant
            const suivant = histComplet.find((h) => STATUTS_ENTREE.includes(h.statut_id) && h.date > creation && h.form_id !== d.form_id);
            const hist = histComplet.filter((h) => h.date >= creation && (!suivant || h.date < suivant.date));

            const cloture = DECOM_CLOTURE.includes(d.statut);
            let branche = 'en_cours';
            let diagnostic = p.diag;
            if (cloture) {
                branche = BRANCHE_DIAG[p.diag] || null;
                if (!branche) {
                    // Diagnostic absent de sn_decom : on le déduit de la ligne d'historique de clôture du décom
                    const ligneCloture = [...hist].reverse().find((h) => h.form_id === d.form_id && BRANCHE_STATUT[h.statut_id]);
                    branche = ligneCloture ? BRANCHE_STATUT[ligneCloture.statut_id] : 'sans_diagnostic';
                    diagnostic = ligneCloture ? { parametrage: 'parametrage', reparation: 'a_reparer', rebut: 'rebus' }[branche] : null;
                }
            }

            const l = {
                decom_id: d.decom_id,
                decom_remplacement: Boolean(Number(d.is_remplacement)),
                decom_regularisation: Boolean(Number(d.is_reg)),
                statut_decom: d.statut,
                date_creation: creation,
                date_cloture: d.date_cloture ? new Date(d.date_cloture) : null,
                serial_number: p.serial_number,
                id_tpe: tpe ? tpe.id : null,
                modele: tpe?.nom_model || null,
                statut_actuel: tpe?.statut || null,
                banque: p.banque,
                point_marchand: p.point_marchand,
                diagnostic,
                branche,
                rebut_apres_reparation: false,
                date_repare: null,
                date_retour_param: null,
                date_livraison: null,
                type_livraison: null,
                date_rebut: null,
                suivi_interrompu: Boolean(suivant), // le TPE est reparti dans un autre décom
            };

            const debutSuivi = creation;
            const livraison = (apres) => {
                const h = premier(hist, STATUTS_LIVRE, apres);
                if (h) {
                    l.date_livraison = h.date;
                    l.type_livraison = h.statut_id === STATUT_REMPLACEMENT ? 'remplacement' : 'back_office';
                }
            };

            if (branche === 'parametrage') {
                const param = premier(hist, [STATUT_PARAMETRAGE], debutSuivi);
                l.date_retour_param = param ? param.date : null;
                livraison(param ? param.date : debutSuivi);
            } else if (branche === 'reparation') {
                const rebut = premier(hist, [STATUT_REBUT], debutSuivi);
                if (rebut) {
                    l.branche = 'rebut';
                    l.rebut_apres_reparation = true;
                    l.date_rebut = rebut.date;
                }
                const rep = premier(hist, [STATUT_REPARE], debutSuivi);
                if (rep) {
                    l.date_repare = rep.date;
                    const param = premier(hist, [STATUT_PARAMETRAGE], rep.date);
                    if (param) {
                        l.date_retour_param = param.date;
                        livraison(param.date);
                    }
                }
            } else if (branche === 'rebut') {
                // Rebut décidé à la clôture : la date de décision est la date de clôture du décom
                const rebut = premier(hist, [STATUT_REBUT], debutSuivi);
                l.date_rebut = l.date_cloture || (rebut ? rebut.date : null);
            }
            lignes.push(l);
        }

        // 6. Résumé + délais médians
        const compte = (f) => lignes.filter(f).length;
        const param = (l) => l.branche === 'parametrage';
        const rep = (l) => l.branche === 'reparation';
        const rebut = (l) => l.branche === 'rebut';
        const resume = {
            total: lignes.length,
            nb_tpe: new Set(lignes.map((l) => l.serial_number)).size,
            nb_decoms: new Set(lignes.map((l) => l.decom_id)).size,
            parametrage: { total: compte(param), livres: compte((l) => param(l) && l.date_livraison) },
            reparation: {
                total: compte(rep),
                repares: compte((l) => rep(l) && l.date_repare),
                retour_param: compte((l) => rep(l) && l.date_retour_param),
                livres: compte((l) => rep(l) && l.date_livraison),
            },
            rebut: {
                total: compte(rebut),
                direct: compte((l) => rebut(l) && !l.rebut_apres_reparation),
                apres_reparation: compte((l) => rebut(l) && l.rebut_apres_reparation),
            },
            en_cours: compte((l) => l.branche === 'en_cours'),
            sans_diagnostic: compte((l) => l.branche === 'sans_diagnostic'),
            livres: {
                back_office: compte((l) => l.type_livraison === 'back_office'),
                remplacement: compte((l) => l.type_livraison === 'remplacement'),
            },
        };

        const delai = (filtre, a, b) => {
            const vals = lignes.filter((l) => filtre(l) && l[a] && l[b]).map((l) => heures(l[a], l[b])).filter((h) => h >= 0);
            return arrondi(mediane(vals));
        };
        const delais = {
            creation_cloture: delai(() => true, 'date_creation', 'date_cloture'),
            param_cloture_livraison: delai(param, 'date_cloture', 'date_livraison'),
            rep_cloture_repare: delai(rep, 'date_cloture', 'date_repare'),
            rep_repare_param: delai(rep, 'date_repare', 'date_retour_param'),
            rep_param_livraison: delai(rep, 'date_retour_param', 'date_livraison'),
            rebut_cloture_rebut: delai((l) => rebut(l) && l.rebut_apres_reparation, 'date_cloture', 'date_rebut'),
        };

        // Ancienneté (heures depuis l'étape précédente) pour repérer les TPE bloqués
        lignes.forEach((l) => {
            const derniere = l.date_livraison || l.date_rebut || l.date_retour_param || l.date_repare || l.date_cloture || l.date_creation;
            l.heures_depuis_derniere_etape = arrondi(heures(derniere, maintenant));
        });

        res.status(200).json({ resume, delais, lignes });
    } catch (error) {
        console.error('Erreur lors du calcul du tableau de bord décom :', error);
        res.status(500).json({ message: 'Erreur lors du calcul du tableau de bord décom', error: error.message });
    }
};

const resumeVide = () => ({
    total: 0, nb_tpe: 0, nb_decoms: 0,
    parametrage: { total: 0, livres: 0 },
    reparation: { total: 0, repares: 0, retour_param: 0, livres: 0 },
    rebut: { total: 0, direct: 0, apres_reparation: 0 },
    en_cours: 0, sans_diagnostic: 0,
    livres: { back_office: 0, remplacement: 0 },
});

module.exports = { getEntonnoirDecom };
