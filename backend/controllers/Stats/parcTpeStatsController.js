// =====================================================================
//  Statistiques du parc TPE (cycle de vie)
//
//  Source unique : history_tpe (journal des changements de statut) + parc_tpe
//  (statut actuel). Aucune requête sur les tables propres à chaque module
//  (décom, réparation, rebut, livraisons...) : tout passage de statut y est
//  déjà tracé.
//
//  Les requêtes SQL n'utilisent PAS de fonctions de fenêtrage (LEAD/LAG) afin
//  de rester compatibles MySQL 5.7, MySQL 8 et MariaDB. Elles s'appuient sur
//  des sous-requêtes corrélées, rapides grâce aux index composites
//  history_tpe(id_tpe, created_at) et history_tpe(statut_id, created_at).
//
//  Vocabulaire :
//   - "passage" / "entrée" : ligne d'historique dont le statut diffère du statut
//     précédent du même TPE (les lignes répétant le même statut sont ignorées).
//   - date_debut : date d'entrée dans le statut
//   - date_fin   : date du premier changement vers un AUTRE statut (NULL = en cours)
// =====================================================================
const { Prisma } = require('@prisma/client');
const prisma = require('../../prisma/client');

// ---------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------
const GRANULARITES = ['day', 'week', 'month'];
const MODES = ['actuel', 'entree', 'presence', 'date'];

// 'YYYY-MM-DD' -> début / fin de journée (UTC = heure d'Abidjan)
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

const getISOWeek = (d) => {
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
    return `${t.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const getPeriodKey = (value, granularity) => {
    const d = new Date(value);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    if (granularity === 'day') return `${y}-${m}-${day}`;
    if (granularity === 'week') return getISOWeek(d);
    return `${y}-${m}`;
};

const heures = (debut, fin) => (new Date(fin) - new Date(debut)) / 3600000;
const arrondi = (n) => (n === null || n === undefined ? null : Math.round(n * 10) / 10);
const mediane = (arr) => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const badRequest = (res, message) => res.status(400).json({ message });

const getStatuts = () =>
    prisma.statut_tpe.findMany({ select: { id: true, statut: true }, orderBy: { id: 'asc' } });

// ---------------------------------------------------------------------
//  Table dérivée des "périodes de statut"
//  Une ligne par ligne d'historique, avec le statut précédent du TPE et,
//  si demandé, la date de sortie du statut.
// ---------------------------------------------------------------------
const periodesSql = ({ statutId = null, depuis = null, jusqua = null, modelId = null, avecFin = false }) => Prisma.sql`
    SELECT
        h.id          AS history_id,
        h.id_tpe      AS id_tpe,
        h.statut_id   AS statut_id,
        h.created_at  AS date_debut,
        h.form_id     AS form_id,
        h.created_by  AS created_by,
        (SELECT h0.statut_id
           FROM history_tpe h0
          WHERE h0.id_tpe = h.id_tpe
            AND (h0.created_at < h.created_at OR (h0.created_at = h.created_at AND h0.id < h.id))
          ORDER BY h0.created_at DESC, h0.id DESC
          LIMIT 1) AS statut_precedent_id
        ${avecFin ? Prisma.sql`,
        (SELECT MIN(h2.created_at)
           FROM history_tpe h2
          WHERE h2.id_tpe = h.id_tpe
            AND h2.statut_id <> h.statut_id
            AND (h2.created_at > h.created_at OR (h2.created_at = h.created_at AND h2.id > h.id))) AS date_fin` : Prisma.empty}
    FROM history_tpe h
    JOIN parc_tpe p ON p.id = h.id_tpe AND p.is_deleted = 0
    WHERE 1 = 1
    ${statutId ? Prisma.sql`AND h.statut_id = ${statutId}` : Prisma.empty}
    ${depuis ? Prisma.sql`AND h.created_at >= ${depuis}` : Prisma.empty}
    ${jusqua ? Prisma.sql`AND h.created_at <= ${jusqua}` : Prisma.empty}
    ${modelId ? Prisma.sql`AND p.model_id = ${modelId}` : Prisma.empty}
`;

// Ne garder que les vraies entrées dans un statut
const ENTREE = Prisma.sql`(per.statut_precedent_id IS NULL OR per.statut_precedent_id <> per.statut_id)`;

// ---------------------------------------------------------------------
//  1. Répartition par statut (actuelle, ou à une date donnée)
//     GET /api/stats/parc-tpe/repartition?date=YYYY-MM-DD&modelId=
//     -> { date, total, incoherences, statuts: [{ id, statut, total }] }
// ---------------------------------------------------------------------
const getRepartitionParcTpe = async (req, res) => {
    try {
        const date = parseFin(req.query.date);
        const modelId = parseId(req.query.modelId);
        if (date === undefined) return badRequest(res, 'Date invalide');
        if (modelId === undefined) return badRequest(res, 'Modèle invalide');

        const statuts = await getStatuts();
        const compte = new Map();
        let incoherences = null;

        if (!date) {
            // Statut actuel : directement depuis parc_tpe
            const groupes = await prisma.parc_tpe.groupBy({
                by: ['statut_id'],
                where: { is_deleted: false, ...(modelId ? { model_id: modelId } : {}) },
                _count: { _all: true },
            });
            groupes.forEach((g) => compte.set(g.statut_id, g._count._all));

            // Contrôle de cohérence : TPE sans historique, ou dont la dernière ligne
            // d'historique ne correspond pas au statut actuel.
            const [row] = await prisma.$queryRaw`
                SELECT COUNT(*) AS n
                FROM parc_tpe p
                LEFT JOIN history_tpe h
                       ON h.id_tpe = p.id
                      AND NOT EXISTS (
                          SELECT 1 FROM history_tpe h2
                           WHERE h2.id_tpe = h.id_tpe
                             AND (h2.created_at > h.created_at OR (h2.created_at = h.created_at AND h2.id > h.id)))
                WHERE p.is_deleted = 0
                  AND (h.id IS NULL OR h.statut_id <> p.statut_id)
                  ${modelId ? Prisma.sql`AND p.model_id = ${modelId}` : Prisma.empty}`;
            incoherences = Number(row?.n ?? 0);
        } else {
            // Photo à une date : dernière ligne d'historique de chaque TPE <= date
            const rows = await prisma.$queryRaw`
                SELECT h.statut_id AS statut_id, COUNT(*) AS n
                FROM history_tpe h
                JOIN parc_tpe p ON p.id = h.id_tpe AND p.is_deleted = 0
                WHERE h.created_at <= ${date}
                  ${modelId ? Prisma.sql`AND p.model_id = ${modelId}` : Prisma.empty}
                  AND NOT EXISTS (
                      SELECT 1 FROM history_tpe h2
                       WHERE h2.id_tpe = h.id_tpe
                         AND h2.created_at <= ${date}
                         AND (h2.created_at > h.created_at OR (h2.created_at = h.created_at AND h2.id > h.id)))
                GROUP BY h.statut_id`;
            rows.forEach((r) => compte.set(Number(r.statut_id), Number(r.n)));
        }

        const data = statuts.map((s) => ({ id: s.id, statut: s.statut, total: compte.get(s.id) || 0 }));
        res.status(200).json({
            date: req.query.date || null,
            total: data.reduce((a, s) => a + s.total, 0),
            incoherences,
            statuts: data,
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la répartition du parc TPE :', error);
        res.status(500).json({ message: 'Erreur lors de la récupération de la répartition du parc TPE', error: error.message });
    }
};

// ---------------------------------------------------------------------
//  2. Flux : entrées dans chaque statut par période
//     GET /api/stats/parc-tpe/flux?from&to&granularity=day|week|month&modelId=
//     -> { statuts, totaux: { [statutId]: nbTpe }, series: [{ period, total, counts: { [statutId]: nbTpe } }] }
//     Les comptes sont en TPE distincts (un TPE entré 2 fois dans la même
//     période et le même statut n'est compté qu'une fois).
// ---------------------------------------------------------------------
const getFluxParcTpe = async (req, res) => {
    try {
        const depuis = parseDebut(req.query.from);
        const jusqua = parseFin(req.query.to);
        const modelId = parseId(req.query.modelId);
        const granularity = GRANULARITES.includes(req.query.granularity) ? req.query.granularity : 'month';
        if (depuis === undefined || jusqua === undefined) return badRequest(res, 'Période invalide');
        if (modelId === undefined) return badRequest(res, 'Modèle invalide');

        const [statuts, rows] = await Promise.all([
            getStatuts(),
            prisma.$queryRaw`
                SELECT per.id_tpe, per.statut_id, per.date_debut
                FROM (${periodesSql({ depuis, jusqua, modelId })}) per
                WHERE ${ENTREE}`,
        ]);

        const buckets = new Map();
        const vus = new Set();
        const totauxSets = new Map();

        for (const r of rows) {
            const statutId = Number(r.statut_id);
            const period = getPeriodKey(r.date_debut, granularity);
            const cle = `${period}|${statutId}|${r.id_tpe}`;

            if (!totauxSets.has(statutId)) totauxSets.set(statutId, new Set());
            totauxSets.get(statutId).add(r.id_tpe);

            if (vus.has(cle)) continue;
            vus.add(cle);
            if (!buckets.has(period)) buckets.set(period, { period, total: 0, counts: {} });
            const b = buckets.get(period);
            b.counts[statutId] = (b.counts[statutId] || 0) + 1;
            b.total += 1;
        }

        const totaux = {};
        totauxSets.forEach((set, id) => { totaux[id] = set.size; });

        res.status(200).json({
            statuts,
            totaux,
            series: [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period)),
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des flux du parc TPE :', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des flux du parc TPE', error: error.message });
    }
};

// ---------------------------------------------------------------------
//  3. Liste des TPE d'un statut
//     GET /api/stats/parc-tpe/tpes?statutId&mode&from&to&date&modelId
//       mode = actuel   : TPE actuellement dans le statut
//              entree   : TPE entrés dans le statut entre from et to
//              presence : TPE présents dans le statut à un moment entre from et to
//              date     : TPE qui étaient dans le statut à la date `date`
//     -> [{ id_tpe, serial_number, modele, statut_actuel, statut_precedent,
//           date_entree, date_sortie, duree_heures, en_cours, form_id, form_type, utilisateur }]
// ---------------------------------------------------------------------
const getTpesParStatut = async (req, res) => {
    try {
        const statutId = parseId(req.query.statutId);
        const mode = MODES.includes(req.query.mode) ? req.query.mode : 'actuel';
        const depuis = parseDebut(req.query.from);
        const jusqua = parseFin(req.query.to);
        const date = parseFin(req.query.date);
        const modelId = parseId(req.query.modelId);

        if (!statutId) return badRequest(res, 'Le statut est obligatoire');
        if (modelId === undefined) return badRequest(res, 'Modèle invalide');
        if (depuis === undefined || jusqua === undefined || date === undefined) return badRequest(res, 'Date invalide');
        if (mode === 'date' && !date) return badRequest(res, 'La date est obligatoire pour le mode "date"');

        const statuts = await getStatuts();
        const nomStatut = new Map(statuts.map((s) => [s.id, s.statut]));
        let rows;

        if (mode === 'actuel') {
            // Base parc_tpe (inclut les TPE sans historique cohérent), date d'entrée
            // = début de la période en cours dans ce statut si elle existe.
            rows = await prisma.$queryRaw`
                SELECT p.id AS id_tpe, p.serial_number, m.nom_model AS modele, p.statut_id AS statut_actuel_id,
                       per.statut_precedent_id, per.date_debut, NULL AS date_fin, per.form_id,
                       f.type AS form_type, u.fullname AS utilisateur
                FROM parc_tpe p
                LEFT JOIN model_piece m ON m.id_model = p.model_id
                LEFT JOIN (
                    SELECT x.* FROM (${periodesSql({ statutId, modelId, avecFin: true })}) x
                    WHERE x.date_fin IS NULL
                      AND (x.statut_precedent_id IS NULL OR x.statut_precedent_id <> x.statut_id)
                ) per ON per.id_tpe = p.id
                LEFT JOIN forms f ON f.id = per.form_id
                LEFT JOIN users u ON u.id_user = per.created_by
                WHERE p.is_deleted = 0
                  AND p.statut_id = ${statutId}
                  ${modelId ? Prisma.sql`AND p.model_id = ${modelId}` : Prisma.empty}
                ORDER BY per.date_debut DESC, p.serial_number ASC`;
        } else {
            let condition;
            let jusquaBase = jusqua;
            if (mode === 'entree') {
                condition = Prisma.sql`
                    ${depuis ? Prisma.sql`AND per.date_debut >= ${depuis}` : Prisma.empty}
                    ${jusqua ? Prisma.sql`AND per.date_debut <= ${jusqua}` : Prisma.empty}`;
            } else if (mode === 'presence') {
                condition = depuis ? Prisma.sql`AND (per.date_fin IS NULL OR per.date_fin >= ${depuis})` : Prisma.empty;
            } else {
                jusquaBase = date;
                condition = Prisma.sql`AND (per.date_fin IS NULL OR per.date_fin > ${date})`;
            }

            rows = await prisma.$queryRaw`
                SELECT per.id_tpe, p.serial_number, m.nom_model AS modele, p.statut_id AS statut_actuel_id,
                       per.statut_precedent_id, per.date_debut, per.date_fin, per.form_id,
                       f.type AS form_type, u.fullname AS utilisateur
                FROM (${periodesSql({ statutId, jusqua: jusquaBase, modelId, avecFin: true })}) per
                JOIN parc_tpe p ON p.id = per.id_tpe
                LEFT JOIN model_piece m ON m.id_model = p.model_id
                LEFT JOIN forms f ON f.id = per.form_id
                LEFT JOIN users u ON u.id_user = per.created_by
                WHERE ${ENTREE}
                ${condition}
                ORDER BY per.date_debut DESC`;
        }

        const maintenant = new Date();
        const data = rows.map((r) => ({
            id_tpe: Number(r.id_tpe),
            serial_number: r.serial_number,
            modele: r.modele || null,
            statut_actuel: nomStatut.get(Number(r.statut_actuel_id)) || null,
            statut_precedent: r.statut_precedent_id ? nomStatut.get(Number(r.statut_precedent_id)) || null : null,
            date_entree: r.date_debut || null,
            date_sortie: r.date_fin || null,
            en_cours: !r.date_fin,
            duree_heures: r.date_debut ? arrondi(heures(r.date_debut, r.date_fin || maintenant)) : null,
            form_id: r.form_id ? Number(r.form_id) : null,
            form_type: r.form_type || null,
            utilisateur: r.utilisateur || null,
        }));

        res.status(200).json(data);
    } catch (error) {
        console.error('Erreur lors de la récupération des TPE par statut :', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des TPE par statut', error: error.message });
    }
};

// ---------------------------------------------------------------------
//  4. Durées passées dans chaque statut
//     GET /api/stats/parc-tpe/durees?from&to&modelId
//     Passages dont l'entrée est dans la période.
//     -> [{ id, statut, nb_passages, nb_termines, nb_en_cours,
//           duree_moyenne_h, duree_mediane_h, duree_max_h, anciennete_moyenne_en_cours_h }]
// ---------------------------------------------------------------------
const getDureesParcTpe = async (req, res) => {
    try {
        const depuis = parseDebut(req.query.from);
        const jusqua = parseFin(req.query.to);
        const modelId = parseId(req.query.modelId);
        if (depuis === undefined || jusqua === undefined) return badRequest(res, 'Période invalide');
        if (modelId === undefined) return badRequest(res, 'Modèle invalide');

        const [statuts, rows] = await Promise.all([
            getStatuts(),
            prisma.$queryRaw`
                SELECT per.statut_id, per.date_debut, per.date_fin
                FROM (${periodesSql({ depuis, jusqua, modelId, avecFin: true })}) per
                WHERE ${ENTREE}`,
        ]);

        const maintenant = new Date();
        const parStatut = new Map();
        for (const r of rows) {
            const id = Number(r.statut_id);
            if (!parStatut.has(id)) parStatut.set(id, { termines: [], enCours: [] });
            const g = parStatut.get(id);
            if (r.date_fin) g.termines.push(heures(r.date_debut, r.date_fin));
            else g.enCours.push(heures(r.date_debut, maintenant));
        }

        const data = statuts
            .filter((s) => parStatut.has(s.id))
            .map((s) => {
                const { termines, enCours } = parStatut.get(s.id);
                const moy = (arr) => (arr.length ? arr.reduce((a, v) => a + v, 0) / arr.length : null);
                return {
                    id: s.id,
                    statut: s.statut,
                    nb_passages: termines.length + enCours.length,
                    nb_termines: termines.length,
                    nb_en_cours: enCours.length,
                    duree_moyenne_h: arrondi(moy(termines)),
                    duree_mediane_h: arrondi(mediane(termines)),
                    duree_max_h: arrondi(termines.length ? Math.max(...termines) : null),
                    anciennete_moyenne_en_cours_h: arrondi(moy(enCours)),
                };
            });

        res.status(200).json(data);
    } catch (error) {
        console.error('Erreur lors du calcul des durées par statut :', error);
        res.status(500).json({ message: 'Erreur lors du calcul des durées par statut', error: error.message });
    }
};

// ---------------------------------------------------------------------
//  5. Chronologie d'un TPE
//     GET /api/stats/parc-tpe/timeline/:sn
//     -> { tpe, evenements: [{ id, date, statut, statut_id, est_changement,
//                               duree_heures, utilisateur, form_id, form_type }] }
// ---------------------------------------------------------------------
const getTimelineTpe = async (req, res) => {
    try {
        const sn = String(req.params.sn || '').trim();
        if (!sn) return badRequest(res, 'Numéro de série obligatoire');

        const tpe = await prisma.parc_tpe.findUnique({
            where: { serial_number: sn },
            include: { statut_tpe: true, model_piece: true },
        });
        if (!tpe || tpe.is_deleted) return res.status(404).json({ message: `Aucun TPE trouvé pour le S/N ${sn}` });

        const historique = await prisma.history_tpe.findMany({
            where: { id_tpe: tpe.id },
            include: {
                statut_tpe: true,
                users: { select: { fullname: true } },
                forms: { select: { id: true, type: true } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
        });

        const maintenant = new Date();
        const evenements = historique.map((h, i) => {
            const precedent = historique[i - 1];
            // durée jusqu'au prochain changement de statut (pas la prochaine ligne)
            const prochain = historique.slice(i + 1).find((x) => x.statut_id !== h.statut_id);
            return {
                id: h.id,
                date: h.created_at,
                statut_id: h.statut_id,
                statut: h.statut_tpe?.statut || null,
                est_changement: !precedent || precedent.statut_id !== h.statut_id,
                duree_heures: arrondi(heures(h.created_at, prochain ? prochain.created_at : maintenant)),
                en_cours: !prochain,
                utilisateur: h.users?.fullname || null,
                form_id: h.forms?.id || null,
                form_type: h.forms?.type || null,
            };
        });

        res.status(200).json({
            tpe: {
                id: tpe.id,
                serial_number: tpe.serial_number,
                modele: tpe.model_piece?.nom_model || null,
                statut_actuel: tpe.statut_tpe?.statut || null,
                statut_actuel_id: tpe.statut_id,
                created_at: tpe.created_at,
            },
            evenements,
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la chronologie du TPE :', error);
        res.status(500).json({ message: 'Erreur lors de la récupération de la chronologie du TPE', error: error.message });
    }
};

// ---------------------------------------------------------------------
//  6. Modèles présents dans le parc (filtre)
//     GET /api/stats/parc-tpe/modeles -> [{ id, nom }]
// ---------------------------------------------------------------------
const getModelesParcTpe = async (req, res) => {
    try {
        const modeles = await prisma.model_piece.findMany({
            where: { parc_tpe: { some: { is_deleted: false } } },
            select: { id_model: true, nom_model: true },
            orderBy: { nom_model: 'asc' },
        });
        res.status(200).json(modeles.map((m) => ({ id: m.id_model, nom: m.nom_model || `Modèle ${m.id_model}` })));
    } catch (error) {
        console.error('Erreur lors de la récupération des modèles du parc :', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des modèles du parc', error: error.message });
    }
};

// ---------------------------------------------------------------------
//  7. Parcours : TPE passés par une suite ordonnée de statuts
//     GET /api/stats/parc-tpe/parcours?statuts=11,14,10&mode=strict|souple
//                                    &regle=fin|debut|tout|aucune&from&to&modelId
//
//     mode   strict : les statuts se suivent directement (A -> B -> C)
//            souple : dans cet ordre, d'autres statuts peuvent s'intercaler (A .. B .. C)
//     regle  fin    : le DERNIER statut du parcours est atteint dans la période
//            debut  : le PREMIER statut du parcours est atteint dans la période
//            tout   : toutes les étapes ont lieu dans la période
//            aucune : pas de contrainte de date
//
//     La séquence d'un TPE est son historique "compressé" (lignes répétant le
//     statut précédent ignorées). Si un TPE a fait le parcours plusieurs fois,
//     on renvoie l'occurrence la plus récente et le nombre d'occurrences.
// ---------------------------------------------------------------------
const MODES_PARCOURS = ['strict', 'souple'];
const REGLES_PARCOURS = ['fin', 'debut', 'tout', 'aucune'];
const MAX_ETAPES = 10;

// Historique trié -> séquence compressée [{ statut_id, date }]
const compresser = (lignes) => {
    const seq = [];
    for (const l of lignes) {
        const statutId = Number(l.statut_id);
        if (!seq.length || seq[seq.length - 1].statut_id !== statutId) seq.push({ statut_id: statutId, date: new Date(l.created_at) });
    }
    return seq;
};

// Toutes les occurrences du parcours dans la séquence -> [[indices des étapes]]
const trouverOccurrences = (seq, chemin, mode, regle, depuis, jusqua) => {
    const dansPeriode = (i) => (!depuis || seq[i].date >= depuis) && (!jusqua || seq[i].date <= jusqua);
    const k = chemin.length;
    const occurrences = [];

    if (mode === 'strict') {
        for (let s = 0; s + k <= seq.length; s++) {
            let ok = true;
            for (let j = 0; j < k && ok; j++) ok = seq[s + j].statut_id === chemin[j];
            if (ok) occurrences.push(Array.from({ length: k }, (_, j) => s + j));
        }
    } else if (regle === 'debut') {
        // Pour chaque départ possible : correspondance la plus serrée vers l'avant
        for (let s = 0; s < seq.length; s++) {
            if (seq[s].statut_id !== chemin[0] || !dansPeriode(s)) continue;
            const idx = [s];
            for (let i = s + 1; i < seq.length && idx.length < k; i++) if (seq[i].statut_id === chemin[idx.length]) idx.push(i);
            if (idx.length === k) occurrences.push(idx);
        }
        return occurrences;
    } else {
        // Pour chaque arrivée possible : correspondance la plus serrée vers l'arrière
        for (let e = 0; e < seq.length; e++) {
            if (seq[e].statut_id !== chemin[k - 1]) continue;
            if (regle === 'fin' && !dansPeriode(e)) continue;
            const idx = [e];
            for (let i = e - 1; i >= 0 && idx.length < k; i--) {
                if (regle === 'tout' && !dansPeriode(i)) break;
                if (seq[i].statut_id === chemin[k - 1 - idx.length]) idx.unshift(i);
            }
            if (idx.length === k) occurrences.push(idx);
        }
    }

    // Application de la règle de période (mode strict, et souple 'tout' pour l'arrivée)
    return occurrences.filter((idx) => {
        if (regle === 'fin') return dansPeriode(idx[k - 1]);
        if (regle === 'debut') return dansPeriode(idx[0]);
        if (regle === 'tout') return idx.every(dansPeriode);
        return true;
    });
};

const getParcoursTpe = async (req, res) => {
    try {
        const chemin = String(req.query.statuts || '')
            .split(',').map((v) => v.trim()).filter(Boolean).map(Number);
        const mode = MODES_PARCOURS.includes(req.query.mode) ? req.query.mode : 'souple';
        const regle = REGLES_PARCOURS.includes(req.query.regle) ? req.query.regle : 'fin';
        const depuis = parseDebut(req.query.from);
        const jusqua = parseFin(req.query.to);
        const modelId = parseId(req.query.modelId);

        if (chemin.length < 2) return badRequest(res, 'Choisissez au moins deux statuts');
        if (chemin.length > MAX_ETAPES) return badRequest(res, `Le parcours est limité à ${MAX_ETAPES} statuts`);
        if (chemin.some((id) => !Number.isInteger(id) || id <= 0)) return badRequest(res, 'Statut invalide');
        if (chemin.some((id, i) => i > 0 && id === chemin[i - 1])) return badRequest(res, 'Deux étapes consécutives ne peuvent pas avoir le même statut');
        if (depuis === undefined || jusqua === undefined) return badRequest(res, 'Période invalide');
        if (modelId === undefined) return badRequest(res, 'Modèle invalide');

        const distincts = [...new Set(chemin)];
        const statuts = await getStatuts();
        const nomStatut = new Map(statuts.map((s) => [s.id, s.statut]));
        if (distincts.some((id) => !nomStatut.has(id))) return badRequest(res, 'Statut inconnu');

        // Historique complet des seuls TPE passés par TOUS les statuts du parcours
        const lignes = await prisma.$queryRaw`
            SELECT h.id_tpe, h.statut_id, h.created_at,
                   p.serial_number, p.statut_id AS statut_actuel_id, m.nom_model AS modele
            FROM history_tpe h
            JOIN (
                SELECT id_tpe FROM history_tpe
                WHERE statut_id IN (${Prisma.join(distincts)})
                GROUP BY id_tpe
                HAVING COUNT(DISTINCT statut_id) = ${distincts.length}
            ) c ON c.id_tpe = h.id_tpe
            JOIN parc_tpe p ON p.id = h.id_tpe AND p.is_deleted = 0
            LEFT JOIN model_piece m ON m.id_model = p.model_id
            ${modelId ? Prisma.sql`WHERE p.model_id = ${modelId}` : Prisma.empty}
            ORDER BY h.id_tpe, h.created_at, h.id`;

        // Regroupement par TPE
        const parTpe = new Map();
        for (const l of lignes) {
            const id = Number(l.id_tpe);
            if (!parTpe.has(id)) parTpe.set(id, { info: l, lignes: [] });
            parTpe.get(id).lignes.push(l);
        }

        const maintenant = new Date();
        const k = chemin.length;
        const tpes = [];
        const durees = [];
        const transitions = Array.from({ length: k - 1 }, () => []);
        let totalOccurrences = 0;

        for (const [id, { info, lignes: hist }] of parTpe) {
            const seq = compresser(hist);
            const occ = trouverOccurrences(seq, chemin, mode, regle, depuis, jusqua);
            if (!occ.length) continue;
            totalOccurrences += occ.length;

            const idx = occ[occ.length - 1]; // occurrence la plus récente
            const etapes = idx.map((i) => {
                const fin = seq[i + 1]?.date || null;
                return {
                    statut_id: seq[i].statut_id,
                    date_entree: seq[i].date,
                    date_sortie: fin,
                    duree_heures: arrondi(heures(seq[i].date, fin || maintenant)),
                };
            });
            const dureeParcours = heures(etapes[0].date_entree, etapes[k - 1].date_entree);
            durees.push(dureeParcours);
            for (let j = 0; j < k - 1; j++) transitions[j].push(heures(etapes[j].date_entree, etapes[j + 1].date_entree));

            tpes.push({
                id_tpe: id,
                serial_number: info.serial_number,
                modele: info.modele || null,
                statut_actuel: nomStatut.get(Number(info.statut_actuel_id)) || null,
                nb_occurrences: occ.length,
                duree_parcours_heures: arrondi(dureeParcours),
                etapes,
            });
        }

        tpes.sort((a, b) => b.etapes[k - 1].date_entree - a.etapes[k - 1].date_entree);
        const moyenne = (arr) => (arr.length ? arr.reduce((a, v) => a + v, 0) / arr.length : null);

        res.status(200).json({
            chemin: chemin.map((id) => ({ id, statut: nomStatut.get(id) })),
            mode,
            regle,
            resume: {
                nb_tpe: tpes.length,
                nb_occurrences: totalOccurrences,
                duree_mediane_h: arrondi(mediane(durees)),
                duree_moyenne_h: arrondi(moyenne(durees)),
                transitions: transitions.map((arr, j) => ({
                    de: nomStatut.get(chemin[j]),
                    vers: nomStatut.get(chemin[j + 1]),
                    duree_mediane_h: arrondi(mediane(arr)),
                    duree_moyenne_h: arrondi(moyenne(arr)),
                })),
            },
            tpes,
        });
    } catch (error) {
        console.error('Erreur lors de la recherche de parcours de statuts :', error);
        res.status(500).json({ message: 'Erreur lors de la recherche de parcours de statuts', error: error.message });
    }
};

module.exports = {
    getRepartitionParcTpe,
    getFluxParcTpe,
    getTpesParStatut,
    getDureesParcTpe,
    getTimelineTpe,
    getModelesParcTpe,
    getParcoursTpe,
};
