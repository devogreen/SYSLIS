// controllers/Notifications/notificationsController.js
// Notifications : éléments en attente d'une action de l'utilisateur connecté.
// - /sidebar : nombre par lien du menu (bulles de la barre latérale)
// - /liste   : mêmes règles, détaillées élément par élément avec un lien vers la page où agir (cloche du header)
//
// Règle « rôle + propriété » : le rôle désigne l'étape du workflow ; quand l'application
// cible déjà une personne (propriétaires de stock, service demandeur, créateur), on l'applique aussi.
// Un élément disparaît tout seul dès que l'action est faite (aucun état « vu » stocké).
const prisma = require('../../prisma/client');

/* ------------------------------- Constantes ------------------------------- */

// Liens du menu (AppSidebar) sur lesquels s'affichent les bulles
const CHEMINS = {
    demandesStock: '/toutes-les-demandes',
    decoms: '/tous-les-decommissionnements',
    creationLivraisonParam: '/livraison-param-decom',
    livraisonsParam: '/livraisons-param-decom',
    creationReparation: '/reparation-tpe',
    lotsReparation: '/reparations-tpe',
    livraisonsReparation: '/toutes-livraisons-reparation',
    rebuts: '/toutes-les-demandes-rebut',
    demandesQr: '/toutes-les-demandes-qr',
}

// Rôles (user_roles.role_id) — mêmes valeurs que les contrôleurs et les écrans
const ROLES = {
    DEMANDEUR_STOCK: 3,
    VALIDATEUR_STOCK: 4,
    RECEPTION_STOCK: 12,
    DEMANDEUR_QR: 15,
    GENERATION_QR: 16,
    IMPRESSION_QR: 17,
    LIVRAISON_QR: 18,
    RECEPTION_QR: 19,
    VERIFICATION_DECOM: 25,
    REPARATION: 35,
    RECEPTION_REPARATION: 36,
    SUPERVISION_REPARATION: 37,
}

// Rôles que les écrans testent par leur nom (roles.nom_role)
const NOMS_ROLES = {
    DECOM: 'decom',
    RECEPTION_DECOM: 'reception_decom',
    VALIDATION_DECOM: 'validation_decom',
    VERIFICATION_DECOM: 'verification_decom',
    CLOTURE_DECOM: 'cloture_decom',
    DEMANDE_REBUT: 'demande_rebut',
    VALIDATION_REBUT: 'validation_rebut',
    REPARATION: 'reparation',
}

const STATUTS_DEMANDE_LIVRABLES = ['valide', 'partiel']
const STATUTS_LIVRAISON_PARAM_OUVERTE = ['en_cours', 'livre']
const STATUT_PARC_A_REPARER = 11
const STATUT_PARC_PARAM_MAINTENANCE = 13

const FORM_ACTIF = { is: { is_deleted: false } }

const LIMITE_LISTE_DEFAUT = 10
const LIMITE_LISTE_MAX = 50

/* -------------------------------- Helpers --------------------------------- */

const toInt = (valeur) => {
    const n = parseInt(valeur, 10)
    return Number.isInteger(n) ? n : null
}

const parseJson = (valeur, defaut = null) => {
    if (valeur == null || valeur === '') return defaut
    if (typeof valeur === 'object') return valeur
    try {
        return JSON.parse(valeur)
    } catch (e) {
        return defaut
    }
}

const snDe = (item) => String(item?.sn ?? item?.serial_number ?? item?.terminalSN ?? '').trim()

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`

/**
 * Une demande de stock est livrable par l'utilisateur s'il est responsable d'un stock actif et non vide
 * de la même pièce, du même modèle et du même service (quand la demande les précise) — même règle que
 * getStocksLivraison / traiterLivraison.
 */
const demandeLivrablePar = (demande, stocksResponsable) => {
    const details = parseJson(demande.details_demande, {}) || {}
    const modelId = toInt(details.selectedModel ?? details.model)
    const serviceId = toInt(details.selectedServicePiece ?? details.service)
    return stocksResponsable.some((s) =>
        s.piece_id === demande.item_id &&
        (!modelId || s.model_id === modelId) &&
        (!serviceId || s.service_id === serviceId)
    )
}

/* ------------------------- Présentation des éléments ----------------------- */
// Chaque élément de la liste : { id, titre, detail, date, lien } — le lien mène à la page où l'action se fait.

const SELECT_DEMANDE = {
    id: true, date_demande: true, nom_demandeur: true, qte_total_demande: true,
    items: { select: { nom_piece: true } },
}
const elementDemande = (d) => ({
    id: d.id,
    titre: `${d.items?.nom_piece || 'Demande'} #${d.id}`,
    detail: [`Quantité : ${d.qte_total_demande}`, d.nom_demandeur].filter(Boolean).join(' · '),
    date: d.date_demande,
    lien: `/demande-details/${d.id}`,
})

const SELECT_FORM = { select: { nom_user: true, last_modified_at: true } }

// Formulaires « classiques » (décom, livraisons, lots, rebut, QR) : titre, quantité, auteur, date du formulaire
const elementFormulaire = (titre, lien, quantite) => (row) => ({
    id: row.id,
    titre: `${titre} #${row.id}`,
    detail: [quantite(row), row.forms?.nom_user].filter(Boolean).join(' · '),
    date: row.forms?.last_modified_at || null,
    lien: lien(row.id),
})

// « TPE » est invariable
const quantiteTpe = (row) => (row.quantite != null ? `${row.quantite} TPE` : null)

// Règle « simple » : un modèle Prisma, un filtre ; count et findMany partagent le même where
const regleSimple = ({ cle, chemin, libelle, actif, modele, where, select, element }) => ({
    cle, chemin, libelle, actif,
    compter: (ctx, db) => db[modele].count({ where: where(ctx) }),
    lister: async (ctx, db, limite) => (await db[modele].findMany({
        where: where(ctx),
        select,
        orderBy: { id: 'desc' },
        take: limite,
    })).map(element),
})

/* ---------------------- Règles calculées hors requête ---------------------- */

// Demandes que l'utilisateur peut livrer depuis un de ses stocks (filtre JSON sur details_demande)
const demandesLivrables = async (ctx, db) => {
    const stocks = await db.stocks.findMany({
        where: {
            is_deleted: false,
            quantite_piece: { gt: 0 },
            OR: [
                { owner: ctx.userId },
                { owner: null, created_by: ctx.userId }, // créateur : seulement pour un stock sans propriétaire
                { stock_owners: { some: { user_id: ctx.userId } } },
            ],
        },
        select: { piece_id: true, model_id: true, service_id: true },
    })
    if (stocks.length === 0) return []
    const demandes = await db.demandes.findMany({
        where: {
            is_deleted: false,
            statut_demande: { in: STATUTS_DEMANDE_LIVRABLES },
            demande_livree: false,
            item_id: { in: [...new Set(stocks.map((s) => s.piece_id))] },
        },
        select: { ...SELECT_DEMANDE, item_id: true, details_demande: true },
        orderBy: { id: 'desc' },
    })
    return demandes.filter((d) => demandeLivrablePar(d, stocks))
}

// Décom d'origine de chaque S/N (dernière ligne sn_decom)
const decomParSerial = async (db, serials) => {
    const map = new Map()
    if (serials.length === 0) return map
    const lignes = await db.sn_decom.findMany({
        where: { serial_number: { in: serials }, is_deleted: false },
        select: { serial_number: true, decom_id: true },
        orderBy: { id: 'desc' },
    })
    lignes.forEach((l) => {
        if (!map.has(l.serial_number)) map.set(l.serial_number, l.decom_id)
    })
    return map
}

// Regroupe des S/N par décom : un élément par décom (+ un élément pour les TPE hors décom)
const elementsParDecom = async (db, serials, limite, { libelleTpe, lienDecom, lienSansDecom, titreSansDecom }) => {
    const decoms = await decomParSerial(db, serials)
    const groupes = new Map()
    serials.forEach((sn) => {
        const decomId = decoms.get(sn) ?? null
        groupes.set(decomId, (groupes.get(decomId) || 0) + 1)
    })
    const elements = [...groupes.entries()]
        .sort((a, b) => (a[0] === null) - (b[0] === null) || (b[0] ?? 0) - (a[0] ?? 0))
        .map(([decomId, n]) => decomId === null
            ? { id: 'hors-decom', titre: titreSansDecom, detail: `${n} ${libelleTpe}`, date: null, lien: lienSansDecom }
            : { id: decomId, titre: `Décom #${decomId}`, detail: `${n} ${libelleTpe}`, date: null, lien: lienDecom(decomId) })
    // Le compteur est en TPE et les lignes en décoms : on indique nous-mêmes si la liste est coupée
    return { elements: elements.slice(0, limite), tronque: elements.length > limite }
}

// TPE en param_maintenance hors livraison param ouverte (même liste que getTpeParamMaintenance)
const tpeParamALivrer = async (db) => {
    const [tpes, livraisons] = await Promise.all([
        db.parc_tpe.findMany({
            where: { statut_id: STATUT_PARC_PARAM_MAINTENANCE, is_deleted: false },
            select: { serial_number: true },
        }),
        db.livraison_param_decom.findMany({
            where: { statut: { in: STATUTS_LIVRAISON_PARAM_OUVERTE } },
            select: { liste_sn: true },
        }),
    ])
    const dejaEnLivraison = new Set()
    livraisons.forEach((l) => (parseJson(l.liste_sn, []) || []).forEach((item) => dejaEnLivraison.add(snDe(item))))
    return tpes.map((t) => String(t.serial_number)).filter((sn) => !dejaEnLivraison.has(sn))
}

const WHERE_TPE_A_REPARER = { statut_id: STATUT_PARC_A_REPARER, is_deleted: false }

/* ---------------------------------- Règles -------------------------------- */
// Chaque règle : { cle, chemin, libelle, actif(ctx), compter(ctx, db), lister(ctx, db, limite) }.
// `actif` évite toute requête pour les utilisateurs qui ne sont pas concernés.

const REGLES = [
    /* ----- Demandes de stock ----- */
    regleSimple({
        cle: 'stock_validation',
        chemin: CHEMINS.demandesStock,
        libelle: 'Demandes de stock à valider',
        actif: (ctx) => ctx.aRole(ROLES.VALIDATEUR_STOCK),
        modele: 'demandes',
        where: () => ({ is_deleted: false, statut_demande: 'en_cours' }),
        select: SELECT_DEMANDE,
        element: elementDemande,
    }),
    regleSimple({
        // Le demandeur corrige une demande retournée (mêmes personnes que updateDemande, hors super admin)
        cle: 'stock_retour',
        chemin: CHEMINS.demandesStock,
        libelle: 'Demandes de stock retournées à corriger',
        actif: (ctx) => ctx.aRole(ROLES.DEMANDEUR_STOCK),
        modele: 'demandes',
        where: (ctx) => ({
            is_deleted: false,
            statut_demande: 'retourne',
            OR: [
                { user_id: ctx.userId },
                { id_demandeur: ctx.userId },
                ...(ctx.serviceIds.length ? [{ service_demandeur: { in: ctx.serviceIds } }] : []),
            ],
        }),
        select: SELECT_DEMANDE,
        element: elementDemande,
    }),
    {
        // Pas de rôle : c'est la responsabilité d'un stock qui désigne le livreur
        cle: 'stock_livraison',
        chemin: CHEMINS.demandesStock,
        libelle: 'Demandes de stock à livrer',
        actif: () => true,
        compter: async (ctx, db) => (await demandesLivrables(ctx, db)).length,
        lister: async (ctx, db, limite) => (await demandesLivrables(ctx, db)).slice(0, limite).map(elementDemande),
    },
    regleSimple({
        // Réception : rôle 12, pour les demandes de son service (destinataires du mail de livraison)
        cle: 'stock_reception',
        chemin: CHEMINS.demandesStock,
        libelle: 'Livraisons de stock à réceptionner',
        actif: (ctx) => ctx.aRole(ROLES.RECEPTION_STOCK) && ctx.serviceIds.length > 0,
        modele: 'demandes',
        where: (ctx) => ({
            is_deleted: false,
            statut_demande: { in: STATUTS_DEMANDE_LIVRABLES },
            demande_recue: false,
            service_demandeur: { in: ctx.serviceIds },
            livraison_piece: { some: { reception_piece: { is: null } } },
        }),
        select: SELECT_DEMANDE,
        element: elementDemande,
    }),

    /* ----- Décommissionnements ----- */
    ...[
        { cle: 'decom_reception', role: NOMS_ROLES.RECEPTION_DECOM, statuts: ['en_cours'], libelle: 'Décoms à réceptionner' },
        { cle: 'decom_retour', role: NOMS_ROLES.DECOM, statuts: ['retourne'], libelle: 'Décoms retournés à corriger' },
        { cle: 'decom_validation', role: NOMS_ROLES.VALIDATION_DECOM, statuts: ['recu'], libelle: 'Décoms à valider' },
        { cle: 'decom_transmission', role: NOMS_ROLES.VALIDATION_DECOM, statuts: ['valide_decom'], libelle: 'Décoms à transmettre à la maintenance' },
        { cle: 'decom_reception_maintenance', role: NOMS_ROLES.VERIFICATION_DECOM, statuts: ['transmis_decom'], libelle: 'Décoms transmis à réceptionner (maintenance)' },
        { cle: 'decom_verification', role: NOMS_ROLES.VERIFICATION_DECOM, statuts: ['verification'], libelle: 'Décoms en vérification technique' },
        { cle: 'decom_cloture', role: NOMS_ROLES.CLOTURE_DECOM, statuts: ['complet'], libelle: 'Décoms à clôturer' },
    ].map((etape) => regleSimple({
        cle: etape.cle,
        chemin: CHEMINS.decoms,
        libelle: etape.libelle,
        actif: (ctx) => ctx.aRole(etape.role),
        modele: 'form_decom',
        where: () => ({ statut: { in: etape.statuts }, forms: FORM_ACTIF }),
        select: { id: true, quantite: true, forms: SELECT_FORM },
        element: elementFormulaire('Décom', (id) => `/decom-details/${id}`, quantiteTpe),
    })),

    /* ----- Livraisons des TPE à paramétrer (décom) ----- */
    {
        // Compte des TPE ; la liste les regroupe par décom, avec le formulaire de livraison pré-rempli
        cle: 'param_a_livrer',
        chemin: CHEMINS.creationLivraisonParam,
        libelle: 'TPE à paramétrer à livrer',
        actif: (ctx) => ctx.aRole(ROLES.VERIFICATION_DECOM),
        compter: async (ctx, db) => (await tpeParamALivrer(db)).length,
        lister: async (ctx, db, limite) => elementsParDecom(db, await tpeParamALivrer(db), limite, {
            libelleTpe: 'TPE à livrer',
            lienDecom: (id) => `/livraison-param-decom?decom=${id}`,
            lienSansDecom: CHEMINS.creationLivraisonParam,
            titreSansDecom: 'TPE hors décom',
        }),
    },
    regleSimple({
        cle: 'param_reception',
        chemin: CHEMINS.livraisonsParam,
        libelle: 'Livraisons TPE param à réceptionner',
        actif: (ctx) => ctx.aRole(ROLES.RECEPTION_REPARATION),
        modele: 'livraison_param_decom',
        where: () => ({ statut: 'en_cours', forms: FORM_ACTIF }),
        select: { id: true, quantite: true, forms: SELECT_FORM },
        element: elementFormulaire('Livraison TPE param', (id) => `/livraison-param-decom-details/${id}`, quantiteTpe),
    }),
    regleSimple({
        cle: 'param_cloture',
        chemin: CHEMINS.livraisonsParam,
        libelle: 'Livraisons TPE param à clôturer',
        actif: (ctx) => ctx.aRole(ROLES.RECEPTION_REPARATION),
        modele: 'livraison_param_decom',
        where: () => ({ statut: 'livre', forms: FORM_ACTIF }),
        select: { id: true, quantite: true, forms: SELECT_FORM },
        element: elementFormulaire('Livraison TPE param', (id) => `/livraison-param-decom-details/${id}`, quantiteTpe),
    }),

    /* ----- Réparation ----- */
    {
        // Compte des TPE ; la liste les regroupe par décom (le lot se lance depuis la page du décom)
        cle: 'reparation_a_lancer',
        chemin: CHEMINS.creationReparation,
        libelle: 'TPE à réparer à mettre en lot',
        actif: (ctx) => ctx.aRole(ROLES.VERIFICATION_DECOM, ROLES.REPARATION),
        compter: (ctx, db) => db.parc_tpe.count({ where: WHERE_TPE_A_REPARER }),
        lister: async (ctx, db, limite) => {
            const tpes = await db.parc_tpe.findMany({ where: WHERE_TPE_A_REPARER, select: { serial_number: true } })
            return elementsParDecom(db, tpes.map((t) => String(t.serial_number)), limite, {
                libelleTpe: 'TPE à réparer',
                lienDecom: (id) => `/decom-details/${id}`,
                lienSansDecom: CHEMINS.creationReparation,
                titreSansDecom: 'TPE hors décom',
            })
        },
    },
    regleSimple({
        cle: 'lot_validation',
        chemin: CHEMINS.lotsReparation,
        libelle: 'Lots de réparation à valider',
        actif: (ctx) => ctx.aRole(ROLES.SUPERVISION_REPARATION),
        modele: 'reparation_tpe',
        where: () => ({ statut: 'en_reparation', forms: FORM_ACTIF }),
        select: { id: true, quantite: true, forms: SELECT_FORM },
        element: elementFormulaire('Lot de réparation', (id) => `/reparation-tpe-details/${id}`, quantiteTpe),
    }),
    regleSimple({
        cle: 'lot_livraison',
        chemin: CHEMINS.lotsReparation,
        libelle: 'Lots de réparation validés à livrer',
        actif: (ctx) => ctx.aRole(ROLES.VERIFICATION_DECOM, ROLES.REPARATION),
        modele: 'reparation_tpe',
        where: () => ({ statut: 'valide', forms: FORM_ACTIF }),
        select: { id: true, quantite: true, forms: SELECT_FORM },
        element: elementFormulaire('Lot de réparation', (id) => `/reparation-tpe-details/${id}`, quantiteTpe),
    }),
    ...[
        { cle: 'repare_reception', statut: 'en_cours', libelle: 'Livraisons de TPE réparés à réceptionner', actif: (ctx) => ctx.aRole(ROLES.RECEPTION_REPARATION) },
        { cle: 'repare_cloture', statut: 'livre', libelle: 'Livraisons de TPE réparés à clôturer', actif: (ctx) => ctx.aRole(ROLES.RECEPTION_REPARATION) },
        { cle: 'repare_retour', statut: 'retourne', libelle: 'Livraisons de TPE réparés retournées', actif: (ctx) => ctx.aRole(NOMS_ROLES.REPARATION) },
    ].map((etape) => regleSimple({
        cle: etape.cle,
        chemin: CHEMINS.livraisonsReparation,
        libelle: etape.libelle,
        actif: etape.actif,
        modele: 'livraison_tpe_repare',
        where: () => ({ statut: etape.statut, forms: FORM_ACTIF }),
        select: { id: true, quantite: true, forms: SELECT_FORM },
        element: elementFormulaire('Livraison TPE réparés', (id) => `/livraison-reparation-details/${id}`, quantiteTpe),
    })),

    /* ----- Mises au rebut ----- */
    ...[
        { cle: 'rebut_validation', role: NOMS_ROLES.VALIDATION_REBUT, statut: 'en_cours', libelle: 'Mises au rebut à valider' },
        { cle: 'rebut_cloture', role: NOMS_ROLES.DEMANDE_REBUT, statut: 'valide', libelle: 'Mises au rebut validées à clôturer' },
    ].map((etape) => regleSimple({
        cle: etape.cle,
        chemin: CHEMINS.rebuts,
        libelle: etape.libelle,
        actif: (ctx) => ctx.aRole(etape.role),
        modele: 'demande_rebut',
        where: () => ({ statut: etape.statut, forms: FORM_ACTIF }),
        select: { id: true, quantite: true, forms: SELECT_FORM },
        element: elementFormulaire('Mise au rebut', (id) => `/demande-rebut-details/${id}`, quantiteTpe),
    })),

    /* ----- Demandes QR ----- */
    ...[
        { cle: 'qr_generation', role: ROLES.GENERATION_QR, libelle: 'Demandes QR à générer', where: () => ({ statut: 'soumise', is_reg: false, forms: FORM_ACTIF }) },
        { cle: 'qr_impression', role: ROLES.IMPRESSION_QR, libelle: 'Demandes QR à imprimer', where: () => ({ statut: 'generee', forms: FORM_ACTIF }) },
        // Une régularisation soumise passe directement à la livraison
        { cle: 'qr_livraison', role: ROLES.LIVRAISON_QR, libelle: 'Demandes QR à livrer', where: () => ({ forms: FORM_ACTIF, OR: [{ statut: 'imprimee' }, { statut: 'soumise', is_reg: true }] }) },
        { cle: 'qr_reception', role: ROLES.RECEPTION_QR, libelle: 'Demandes QR à réceptionner', where: () => ({ statut: 'livree', forms: FORM_ACTIF }) },
        // Demande suspendue : son demandeur la reprend
        { cle: 'qr_suspendue', role: ROLES.DEMANDEUR_QR, libelle: 'Vos demandes QR suspendues', where: (ctx) => ({ statut: 'suspendue', forms: { is: { is_deleted: false, created_by: ctx.userId } } }) },
    ].map((etape) => regleSimple({
        cle: etape.cle,
        chemin: CHEMINS.demandesQr,
        libelle: etape.libelle,
        actif: (ctx) => ctx.aRole(etape.role),
        modele: 'demande_qr',
        where: etape.where,
        select: { id: true, quantite_marchand: true, quantite_qr: true, forms: SELECT_FORM },
        element: elementFormulaire('Demande QR', (id) => `/demande-qr-details/${id}`,
            (row) => pluriel(row.quantite_marchand, 'marchand')),
    })),
]

/* ------------------------------- Calcul ----------------------------------- */

// Rôles (ids et noms) et services de l'utilisateur
const chargerContexte = async (db, userId) => {
    const [roles, services] = await Promise.all([
        db.user_roles.findMany({
            where: { user_id: userId },
            select: { role_id: true, roles: { select: { nom_role: true } } },
        }),
        db.user_services.findMany({
            where: { user_id: userId },
            select: { service_id: true },
        }),
    ])
    const roleIds = new Set(roles.map((r) => r.role_id))
    const roleNoms = new Set(roles.map((r) => r.roles?.nom_role).filter(Boolean))
    return {
        userId,
        serviceIds: services.map((s) => s.service_id),
        // Accepte des ids (nombres) et des noms de rôle (chaînes)
        aRole: (...valeurs) => valeurs.some((v) => (typeof v === 'number' ? roleIds.has(v) : roleNoms.has(v))),
    }
}

// Exécute `travail(regle)` pour chaque règle active ; une règle en erreur est journalisée et ignorée
const executerRegles = async (db, userId, regles, travail) => {
    const ctx = await chargerContexte(db, userId)
    const actives = regles.filter((r) => r.actif(ctx))
    return Promise.all(actives.map(async (regle) => {
        try {
            return { regle, ...(await travail(regle, ctx)) }
        } catch (error) {
            console.error(`[NOTIFICATIONS] Règle ${regle.cle} en erreur :`, error)
            return { regle, nombre: 0, elements: [] }
        }
    }))
}

/** Nombre d'éléments en attente, par lien du menu. */
const calculerNotificationsSidebar = async (db, userId, regles = REGLES) => {
    const resultats = await executerRegles(db, userId, regles, async (regle, ctx) => ({
        nombre: Number(await regle.compter(ctx, db)) || 0,
    }))
    const details = resultats
        .filter((r) => r.nombre > 0)
        .map((r) => ({ cle: r.regle.cle, chemin: r.regle.chemin, libelle: r.regle.libelle, nombre: r.nombre }))
    const parChemin = {}
    details.forEach((d) => { parChemin[d.chemin] = (parChemin[d.chemin] || 0) + d.nombre })
    const total = details.reduce((acc, d) => acc + d.nombre, 0)
    return { total, parChemin, details }
}

/** Éléments en attente regroupés par étape (au plus `limite` éléments par groupe, les plus récents). */
const calculerListeNotifications = async (db, userId, limite = LIMITE_LISTE_DEFAUT, regles = REGLES) => {
    const resultats = await executerRegles(db, userId, regles, async (regle, ctx) => {
        const nombre = Number(await regle.compter(ctx, db)) || 0
        const liste = nombre > 0 && regle.lister ? await regle.lister(ctx, db, limite) : []
        // lister renvoie un tableau d'éléments (un par élément compté) ou { elements, tronque }
        const elements = Array.isArray(liste) ? liste : (liste.elements || [])
        const tronque = Array.isArray(liste) ? nombre > elements.length : Boolean(liste.tronque)
        return { nombre, elements, tronque }
    })
    const groupes = resultats
        .filter((r) => r.nombre > 0)
        .map((r) => ({
            cle: r.regle.cle,
            chemin: r.regle.chemin,
            libelle: r.regle.libelle,
            nombre: r.nombre,
            elements: r.elements || [],
            tronque: Boolean(r.tronque), // d'autres éléments existent : lien « Voir la liste complète »
        }))
    const total = groupes.reduce((acc, g) => acc + g.nombre, 0)
    return { total, groupes }
}

/* ------------------------------ Contrôleurs -------------------------------- */
// Utilisateur pris dans le token (req.user, posé par authentifier)

// GET /api/notifications/sidebar
const getNotificationsSidebar = async (req, res) => {
    try {
        res.status(200).json(await calculerNotificationsSidebar(prisma, req.user.id_user))
    } catch (error) {
        console.error("Erreur lors du calcul des notifications :", error)
        res.status(500).json({ message: "Erreur lors du calcul des notifications." })
    }
}

// GET /api/notifications/liste?limite=10
const getListeNotifications = async (req, res) => {
    try {
        const demande = toInt(req.query.limite)
        const limite = demande ? Math.min(Math.max(demande, 1), LIMITE_LISTE_MAX) : LIMITE_LISTE_DEFAUT
        res.status(200).json(await calculerListeNotifications(prisma, req.user.id_user, limite))
    } catch (error) {
        console.error("Erreur lors du chargement des notifications :", error)
        res.status(500).json({ message: "Erreur lors du chargement des notifications." })
    }
}

module.exports = {
    getNotificationsSidebar,
    getListeNotifications,
    calculerNotificationsSidebar,
    calculerListeNotifications,
    demandeLivrablePar,
    REGLES,
    CHEMINS,
}
