const TEST_ENV = require("../../utils/consts")

const prisma = require('../../prisma/client');
const sendMail = require("../../utils/emailSender");

const configEmail = process.env.NODEMAILER_USER

// baseUrl est l'addresse du site de livraison
const baseUrl = process.env.FRONTEND_BASE_URL || "https://livraisons.greenpayci.com";
// localUrl est l'addresse en local pour les tests
const localUrl = "http://localhost:5173"
let GENERAL_URL = baseUrl
if (TEST_ENV) {
    GENERAL_URL = localUrl
}

/*************************************************************************
 *  REPARATION DES TPE PAR LOTS
 *
 *  1. Création du lot (rôles 25 ou 35)      : TPE a_reparer (11) -> decom_en_reparation (14)
 *  2. Validation du lot (rôle 37)           : TPE validés 14 -> repare (10)
 *                                             TPE non validés 14 -> a_reparer (11) (re-réparables)
 *  3. Livraison du lot (rôles 25 ou 35)     : crée une livraison_tpe_repare (en_cours)
 *  4. Réception / clôture (rôle 36)         : voir decomController (receptionLivraisonReparation...)
 *
 *  Si le lot est fait depuis un décom, le décom avance UNIQUEMENT quand tous
 *  ses TPE a_reparer ont franchi l'étape :
 *  (clos | reception_decom_param) -> decom_en_reparation -> decom_repare
 *  -> transmis_decom_repare -> receptionne_decom_repare
 *************************************************************************/

const ROLE_VERIFICATION_DECOM = 25
const ROLE_SUPERVISION_DECOM = 26
const ROLE_REPARATION = 35
const ROLE_RECEPTION_REPARATION = 36
const ROLE_SUPERVISION_REPARATION = 37

const ROLES_REPARATEURS = [ROLE_VERIFICATION_DECOM, ROLE_REPARATION]

const STATUT_REPARE = 10
const STATUT_A_REPARER = 11
const STATUT_EN_REPARATION = 14

// Statuts de décom à partir desquels on peut créer un lot de réparation
const STATUTS_DECOM_REPARABLES = ['clos', 'reception_decom_param', 'decom_en_reparation']

/* --------------------------------- Helpers -------------------------------- */

const hasAnyRole = async (userId, roleIds) => {
    const role = await prisma.user_roles.findFirst({
        where: { user_id: userId, role_id: { in: roleIds } },
    })
    return Boolean(role)
}

const notifierRoles = async (roleIds, subject, html) => {
    try {
        const roles = await prisma.user_roles.findMany({
            where: { role_id: { in: roleIds } },
            include: { users: true },
        })
        const destinataires = [...new Set(roles.map((r) => r.users?.email).filter(Boolean))]
        if (destinataires.length == 0) return
        await sendMail({
            to: configEmail,
            bcc: destinataires,
            subject,
            html,
        })
    } catch (mailError) {
        console.error("Erreur lors de l'envoi des mails :", mailError)
    }
}

const parseListe = (valeur) => {
    if (!valeur) return []
    if (Array.isArray(valeur)) return valeur
    try {
        const liste = JSON.parse(valeur)
        return Array.isArray(liste) ? liste : []
    } catch (e) {
        return []
    }
}

const snDe = (item) => String(item?.sn ?? item?.serial_number ?? item?.terminalSN ?? '').trim()

const mailHtml = (paragraphes, nombre, commentaire, lien) => `
    <p>Bonjour,</p>
    ${paragraphes.map((p) => `<p>${p}</p>`).join('')}
    <ul>
    <li><strong>Nombre de TPE :</strong> ${nombre}</li>
    </ul>
    <br>
    <p>Commentaire : ${commentaire ? commentaire : '(sans commentaire)'}<p>
    <br>
    <p>Retrouvez le détail à ce lien :
    <span>
    <a href="${lien}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
        Cliquez ici !
    </a>
    </span>
    </p>
    <br><br>
    <p>Green - Pay vous remercie.</p>
`

const lienLot = (id) => `${GENERAL_URL}/reparation-tpe-details/${id}`
const lienLivraison = (id) => `${GENERAL_URL}/livraison-reparation-details/${id}`

// Met à jour le statut parc d'une liste de TPE et trace l'historique
const changerStatutParc = async (tx, serials, statutId, utilisateur, formId, dateAction) => {
    if (!serials.length) return 0
    const tpes = await tx.parc_tpe.findMany({
        where: { serial_number: { in: serials } },
        select: { id: true },
    })
    if (!tpes.length) return 0
    await tx.parc_tpe.updateMany({
        where: { id: { in: tpes.map((t) => t.id) } },
        data: {
            statut_id: statutId,
            updated_by: utilisateur.id_user,
            updated_at: dateAction,
            last_modified_at: dateAction,
        },
    })
    await tx.history_tpe.createMany({
        data: tpes.map((t) => ({
            id_tpe: t.id,
            created_by: utilisateur.id_user,
            created_at: dateAction,
            statut_id: statutId,
            form_id: formId,
        })),
    })
    return tpes.length
}

// S/N des TPE du décom diagnostiqués "a_reparer" lors de la vérification technique
const getSnAReparerDecom = async (decomId, client = prisma) => {
    const lignes = await client.sn_decom.findMany({
        where: { decom_id: decomId, is_deleted: false, statut: 'a_reparer' },
        select: { serial_number: true },
    })
    return [...new Set(lignes.map((l) => String(l.serial_number)))]
}

const getSnParamDecom = async (decomId, client = prisma) => {
    const lignes = await client.sn_decom.findMany({
        where: { decom_id: decomId, is_deleted: false, statut: 'parametrage' },
        select: { serial_number: true },
    })
    return lignes.length
}

// Etat d'avancement de la réparation des TPE d'un décom (tous lots non annulés confondus)
const etatReparationDecom = async (decomId, client = prisma) => {
    const lots = await client.reparation_tpe.findMany({
        where: { decom_id: decomId, statut: { not: 'annule' } },
        include: { validation_reparation_tpe: true },
    })
    const enCours = new Set()
    const valides = new Set()
    lots.forEach((lot) => {
        if (lot.statut == 'en_reparation') {
            parseListe(lot.liste_sn).forEach((item) => enCours.add(snDe(item)))
        }
        const validation = lot.validation_reparation_tpe.at(-1)
        if (validation) {
            parseListe(validation.liste_sn).forEach((item) => valides.add(snDe(item)))
        }
    })

    const livraisons = lots.length ? await client.livraison_tpe_repare.findMany({
        where: { reparation_id: { in: lots.map((l) => l.id) }, statut: { not: 'annule' } },
        include: { reception_tpe_repare: true },
    }) : []
    const livres = new Set()
    const recus = new Set()
    livraisons.forEach((livraison) => {
        parseListe(livraison.liste_sn).forEach((item) => livres.add(snDe(item)))
        const reception = livraison.reception_tpe_repare.filter((r) => r.type == 'reception').at(-1)
        if (reception) {
            parseListe(reception.liste_sn).forEach((item) => recus.add(snDe(item)))
        }
    })

    return { enCours, valides, livres, recus }
}

const contientTout = (set, serials) => serials.length > 0 && serials.every((sn) => set.has(sn))

// Fait avancer le décom d'une étape si TOUS ses TPE a_reparer ont franchi l'étape.
// Retourne le nouveau statut, ou null si le décom ne bouge pas.
const avancerDecomReparation = async (tx, decomId) => {
    if (!decomId) return null
    const decom = await tx.form_decom.findUnique({ where: { id: decomId } })
    if (!decom) return null

    const snAReparer = await getSnAReparerDecom(decomId, tx)
    if (snAReparer.length == 0) return null
    const etat = await etatReparationDecom(decomId, tx)

    let nouveauStatut = null
    if (['clos', 'reception_decom_param'].includes(decom.statut)) {
        const couverts = new Set([...etat.enCours, ...etat.valides])
        if (contientTout(couverts, snAReparer)) nouveauStatut = 'decom_en_reparation'
    } else if (decom.statut == 'decom_en_reparation') {
        if (contientTout(etat.valides, snAReparer)) nouveauStatut = 'decom_repare'
    } else if (decom.statut == 'decom_repare') {
        if (contientTout(etat.livres, snAReparer)) nouveauStatut = 'transmis_decom_repare'
    } else if (decom.statut == 'transmis_decom_repare') {
        if (contientTout(etat.recus, snAReparer)) nouveauStatut = 'receptionne_decom_repare'
    }

    if (nouveauStatut) {
        await tx.form_decom.update({
            where: { id: decomId },
            data: { statut: nouveauStatut },
        })
    }
    return nouveauStatut
}

// Utilisé par receptionLivraisonReparation (decomController) après la réception d'une livraison
const avancerDecomApresReceptionReparation = async (tx, reparationId) => {
    if (!reparationId) return null
    const lot = await tx.reparation_tpe.findUnique({ where: { id: reparationId } })
    if (!lot?.decom_id) return null
    return avancerDecomReparation(tx, lot.decom_id)
}

/* -------------------------------- Création --------------------------------- */

// POST /reparerListeTpe  { userId, listeSn, commentaire, decomId? }
// Crée un lot de TPE en réparation (ne crée plus de livraison directement)
const reparerListeTpe = async (req, res) => {
    try {
        const { userId, listeSn, commentaire, decomId } = req.body

        const utilisateur = await prisma.users.findUnique({
            where: { id_user: parseInt(userId) },
        })
        if (!utilisateur) {
            return res.status(404).json({ message: "Utilisateur non enregistré !" });
        }
        if (!(await hasAnyRole(utilisateur.id_user, ROLES_REPARATEURS))) {
            console.error(`Utilisateur ${utilisateur.username} non autorisé à créer un lot de réparation !`)
            return res.status(403).json({ message: "Vous n'êtes pas autorisé à mettre des TPE en réparation !" });
        }

        // Dédoublonnage par S/N
        const parSn = new Map()
        parseListe(listeSn).forEach((item) => {
            const sn = snDe(item)
            if (sn) parSn.set(sn, { ...item, sn })
        })
        const details = [...parSn.values()]
        if (details.length == 0) {
            return res.status(400).json({ message: "Liste S/N vide ou invalide." });
        }
        const serials = details.map((d) => d.sn)

        // Tous les TPE doivent être a_reparer dans le parc
        const tpes = await prisma.parc_tpe.findMany({
            where: { serial_number: { in: serials }, is_deleted: false },
            select: { id: true, serial_number: true, statut_id: true },
        })
        const tpeParSn = new Map(tpes.map((t) => [t.serial_number, t]))
        const nonConformes = serials.filter((sn) => tpeParSn.get(sn)?.statut_id !== STATUT_A_REPARER)
        if (nonConformes.length > 0) {
            return res.status(400).json({ message: `TPE non disponibles pour la réparation : ${nonConformes.join(', ')}` });
        }

        // Lot créé depuis un décom
        let decom = null
        if (decomId) {
            decom = await prisma.form_decom.findUnique({
                where: { id: parseInt(decomId) },
                include: { forms: true },
            })
            if (!decom || decom.forms?.is_deleted) {
                return res.status(404).json({ message: "Décommissionnement introuvable !" });
            }
            if (!STATUTS_DECOM_REPARABLES.includes(decom.statut)) {
                return res.status(400).json({ message: "Statut du décommissionnement non conforme pour une réparation !" });
            }
            // La livraison des TPE param passe en premier
            if (decom.statut == 'clos' && (await getSnParamDecom(decom.id)) > 0) {
                return res.status(400).json({ message: "Les TPE à paramétrer de ce décom doivent d'abord être livrés et réceptionnés !" });
            }
            const snAReparer = await getSnAReparerDecom(decom.id)
            const horsDecom = serials.filter((sn) => !snAReparer.includes(sn))
            if (horsDecom.length > 0) {
                return res.status(400).json({ message: `TPE n'appartenant pas aux TPE à réparer du décom : ${horsDecom.join(', ')}` });
            }
        }

        const dateAction = new Date()

        const operation = await prisma.$transaction(async (tx) => {
            const reparationForm = await tx.forms.create({
                data: {
                    type: 'reparation_tpe',
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    nom_user: utilisateur.fullname,
                    commentaire,
                },
            });
            const reparation = await tx.reparation_tpe.create({
                data: {
                    form_id: reparationForm.id,
                    decom_id: decom ? decom.id : null,
                    statut: 'en_reparation',
                    quantite: details.length,
                    liste_sn: JSON.stringify(details),
                },
            });

            // Parc : a_reparer (11) -> decom_en_reparation (14)
            await changerStatutParc(tx, serials, STATUT_EN_REPARATION, utilisateur, reparationForm.id, dateAction)

            // Rattachement des fiches "TPE à réparer" au lot
            const tpeIds = serials.map((sn) => tpeParSn.get(sn)?.id).filter(Boolean)
            await tx.tpe_a_reparer.updateMany({
                where: { tpe_id: { in: tpeIds }, is_deleted: false, etat: 'defectueux' },
                data: {
                    reparation_id: reparation.id,
                    updated_by: utilisateur.id_user,
                    updated_at: dateAction,
                    last_modified_at: dateAction,
                },
            })

            const decomStatut = decom ? await avancerDecomReparation(tx, decom.id) : null
            return { reparationForm, reparation, decomStatut }
        }, {
            maxWait: 10000,
            timeout: 30000,
        })

        const paragraphes = [`Un lot de ${details.length} TPE a été mis en réparation par ${utilisateur.fullname}. Il est en attente de validation.`]
        if (decom) {
            paragraphes.push(operation.decomStatut
                ? `Tous les TPE à réparer du décommissionnement ${decom.id} sont désormais en réparation.`
                : `Réparation partielle des TPE du décommissionnement ${decom.id}.`)
        }
        await notifierRoles(
            decom ? [ROLE_SUPERVISION_REPARATION, ROLE_SUPERVISION_DECOM] : [ROLE_SUPERVISION_REPARATION],
            `SYSLIS - NOUVEAU LOT DE TPE EN REPARATION`,
            mailHtml(paragraphes, details.length, commentaire, lienLot(operation.reparation.id)),
        )

        console.log(`Lot de réparation ${operation.reparation.id} créé par ${utilisateur.username}`)
        res.status(201).json({
            message: 'Lot de réparation créé avec succès !',
            data: operation,
        });
    } catch (error) {
        console.error("Erreur lors de la création du lot de réparation :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

/* -------------------------------- Lecture --------------------------------- */

const getAllReparationTpe = async (req, res) => {
    try {
        const lots = await prisma.reparation_tpe.findMany({
            include: {
                forms: true,
                validation_reparation_tpe: {
                    include: { forms: true },
                },
            },
            orderBy: {
                forms: { last_modified_at: 'desc' },
            },
        })
        // Livraison générée par chaque lot (s'il y en a une)
        const livraisons = await prisma.livraison_tpe_repare.findMany({
            where: { reparation_id: { in: lots.map((l) => l.id) } },
            select: { id: true, reparation_id: true, statut: true },
        })
        const livraisonParLot = new Map(livraisons.map((l) => [l.reparation_id, l]))
        res.status(200).json(lots.map((lot) => ({ ...lot, livraison: livraisonParLot.get(lot.id) || null })));
    } catch (error) {
        console.error("Erreur lors de la récupération des lots de réparation :", error)
        res.status(500).json({ message: "Erreur lors de la récupération des lots de réparation", error });
    }
}

const getOneReparationTpe = async (req, res) => {
    try {
        const { id } = req.params
        const lot = await prisma.reparation_tpe.findUnique({
            where: { id: parseInt(id) },
            include: {
                forms: {
                    include: {
                        users_forms_created_byTousers: true,
                        users_forms_updated_byTousers: true,
                    },
                },
                validation_reparation_tpe: {
                    include: { forms: true },
                },
                form_decom: {
                    select: { id: true, statut: true },
                },
            },
        })
        if (!lot) {
            return res.status(404).json({ message: "Lot de réparation introuvable !" });
        }
        const livraison = await prisma.livraison_tpe_repare.findFirst({
            where: { reparation_id: lot.id },
            select: { id: true, statut: true },
            orderBy: { id: 'desc' },
        })
        res.status(200).json({ ...lot, livraison });
    } catch (error) {
        console.error("Erreur lors de la récupération du lot de réparation :", error)
        res.status(500).json({ message: "Erreur lors de la récupération du lot de réparation", error });
    }
}

/* -------------------------------- Validation -------------------------------- */

// PUT /validerReparationTpe/:id  { userId, commentaire, listeValidee }
const validerReparationTpe = async (req, res) => {
    try {
        const { id } = req.params
        const { userId, commentaire, listeValidee } = req.body

        const lot = await prisma.reparation_tpe.findUnique({
            where: { id: parseInt(id) },
            include: { forms: true },
        })
        if (!lot) {
            return res.status(404).json({ message: "Lot de réparation introuvable !" });
        }
        if (lot.forms?.is_deleted || lot.statut == 'annule') {
            return res.status(400).json({ message: "Lot de réparation annulé !" });
        }
        if (lot.statut != 'en_reparation') {
            return res.status(400).json({ message: "Ce lot a déjà été validé !" });
        }

        const utilisateur = await prisma.users.findUnique({
            where: { id_user: parseInt(userId) },
        })
        if (!utilisateur) {
            return res.status(404).json({ message: "Utilisateur non enregistré !" });
        }
        if (!(await hasAnyRole(utilisateur.id_user, [ROLE_SUPERVISION_REPARATION]))) {
            console.error(`Utilisateur ${utilisateur.username} non autorisé à valider un lot de réparation !`)
            return res.status(403).json({ message: "Vous n'êtes pas autorisé à valider ce lot !" });
        }

        const listeLot = parseListe(lot.liste_sn)
        const snLot = new Set(listeLot.map(snDe))
        const snValides = new Set(parseListe(listeValidee).map(snDe).filter((sn) => snLot.has(sn)))
        const detailsValides = listeLot.filter((item) => snValides.has(snDe(item)))
        const detailsRefuses = listeLot.filter((item) => !snValides.has(snDe(item)))
        if (detailsValides.length == 0) {
            return res.status(400).json({ message: "Vous devez valider au moins un TPE !" });
        }

        const dateAction = new Date()

        const operation = await prisma.$transaction(async (tx) => {
            const validationForm = await tx.forms.create({
                data: {
                    type: 'validation_reparation_tpe',
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    nom_user: utilisateur.fullname,
                    commentaire,
                },
            })
            const validation = await tx.validation_reparation_tpe.create({
                data: {
                    form_id: validationForm.id,
                    reparation_id: lot.id,
                    quantite: detailsValides.length,
                    liste_sn: JSON.stringify(detailsValides),
                },
            })
            await tx.reparation_tpe.update({
                where: { id: lot.id },
                data: { statut: 'valide' },
            })

            // Parc : validés -> repare (10), refusés -> a_reparer (11)
            const serialsValides = detailsValides.map(snDe)
            const serialsRefuses = detailsRefuses.map(snDe)
            await changerStatutParc(tx, serialsValides, STATUT_REPARE, utilisateur, validationForm.id, dateAction)
            await changerStatutParc(tx, serialsRefuses, STATUT_A_REPARER, utilisateur, validationForm.id, dateAction)

            const tousTpes = await tx.parc_tpe.findMany({
                where: { serial_number: { in: [...serialsValides, ...serialsRefuses] } },
                select: { id: true, serial_number: true },
            })
            const idParSn = new Map(tousTpes.map((t) => [t.serial_number, t.id]))

            // Fiches "TPE à réparer" des TPE validés : pièces réparées + mouvements
            const fiches = await tx.tpe_a_reparer.findMany({
                where: {
                    tpe_id: { in: serialsValides.map((sn) => idParSn.get(sn)).filter(Boolean) },
                    is_deleted: false,
                    etat: 'defectueux',
                },
            })
            const ficheParTpe = new Map(fiches.map((f) => [f.tpe_id, f]))
            const mouvements = []
            for (const item of detailsValides) {
                const fiche = ficheParTpe.get(idParSn.get(snDe(item)))
                if (!fiche) continue
                const piecesIds = (Array.isArray(item.listePiece) ? item.listePiece : [])
                    .map((p) => Number(p?.piece_id ?? p?.items?.id_piece))
                    .filter((pid) => !isNaN(pid))
                if (piecesIds.length) {
                    await tx.pieces_a_reparer.updateMany({
                        where: { sn_id: fiche.id, piece_id: { in: piecesIds } },
                        data: {
                            etat: 'repare',
                            updated_by: utilisateur.id_user,
                            updated_at: dateAction,
                        },
                    })
                    piecesIds.forEach((pid) => mouvements.push({
                        piece_id: pid,
                        reparation_id: lot.id,
                        ancien_etat: 'defectueux',
                        nouvel_etat: 'repare',
                        created_at: dateAction,
                        created_by: utilisateur.id_user,
                    }))
                }
            }
            if (fiches.length) {
                await tx.tpe_a_reparer.updateMany({
                    where: { id: { in: fiches.map((f) => f.id) } },
                    data: {
                        etat: 'repare',
                        reparation_id: lot.id,
                        updated_by: utilisateur.id_user,
                        updated_at: dateAction,
                        last_modified_at: dateAction,
                    },
                })
            }
            if (mouvements.length) {
                await tx.mouvement_piece_a_reparer.createMany({ data: mouvements })
            }

            // Fiches des TPE refusés : détachées du lot pour pouvoir être remises en réparation
            const idsRefuses = serialsRefuses.map((sn) => idParSn.get(sn)).filter(Boolean)
            if (idsRefuses.length) {
                await tx.tpe_a_reparer.updateMany({
                    where: { tpe_id: { in: idsRefuses }, is_deleted: false, etat: 'defectueux', reparation_id: lot.id },
                    data: {
                        reparation_id: null,
                        updated_by: utilisateur.id_user,
                        updated_at: dateAction,
                        last_modified_at: dateAction,
                    },
                })
            }

            const decomStatut = await avancerDecomReparation(tx, lot.decom_id)
            return { validationForm, validation, decomStatut }
        }, {
            maxWait: 10000,
            timeout: 30000,
        })

        const paragraphes = [`${detailsValides.length} TPE sur ${listeLot.length} du lot de réparation ${lot.id} ont été validés par ${utilisateur.fullname}.`]
        if (detailsRefuses.length) {
            paragraphes.push(`${detailsRefuses.length} TPE non validé(s) repassent au statut "à réparer".`)
        }
        if (operation.decomStatut) {
            paragraphes.push(`Tous les TPE à réparer du décommissionnement ${lot.decom_id} sont réparés.`)
        }
        paragraphes.push(`Le lot peut maintenant être livré.`)
        await notifierRoles(
            lot.decom_id ? [...ROLES_REPARATEURS, ROLE_SUPERVISION_DECOM] : ROLES_REPARATEURS,
            `SYSLIS - VALIDATION LOT DE REPARATION`,
            mailHtml(paragraphes, detailsValides.length, commentaire, lienLot(lot.id)),
        )

        console.log(`Lot de réparation ${lot.id} validé par ${utilisateur.username}`)
        res.status(201).json({
            message: 'Lot de réparation validé avec succès !',
            data: operation,
        });
    } catch (error) {
        console.error("Erreur lors de la validation du lot de réparation :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

/* -------------------------------- Livraison --------------------------------- */

// PUT /livrerReparationTpe/:id  { userId, commentaire }
// Crée la livraison des TPE validés du lot
const livrerReparationTpe = async (req, res) => {
    try {
        const { id } = req.params
        const { userId, commentaire } = req.body

        const lot = await prisma.reparation_tpe.findUnique({
            where: { id: parseInt(id) },
            include: { forms: true, validation_reparation_tpe: true },
        })
        if (!lot) {
            return res.status(404).json({ message: "Lot de réparation introuvable !" });
        }
        if (lot.forms?.is_deleted || lot.statut == 'annule') {
            return res.status(400).json({ message: "Lot de réparation annulé !" });
        }
        if (lot.statut == 'livre') {
            return res.status(400).json({ message: "Ce lot a déjà été livré !" });
        }
        if (lot.statut != 'valide') {
            return res.status(400).json({ message: "Le lot doit être validé avant d'être livré !" });
        }

        const utilisateur = await prisma.users.findUnique({
            where: { id_user: parseInt(userId) },
        })
        if (!utilisateur) {
            return res.status(404).json({ message: "Utilisateur non enregistré !" });
        }
        if (!(await hasAnyRole(utilisateur.id_user, ROLES_REPARATEURS))) {
            console.error(`Utilisateur ${utilisateur.username} non autorisé à livrer un lot de réparation !`)
            return res.status(403).json({ message: "Vous n'êtes pas autorisé à livrer ce lot !" });
        }

        const validation = lot.validation_reparation_tpe.at(-1)
        const listeValidee = parseListe(validation?.liste_sn)
        if (listeValidee.length == 0) {
            return res.status(400).json({ message: "Aucun TPE validé dans ce lot !" });
        }

        const dateAction = new Date()

        const operation = await prisma.$transaction(async (tx) => {
            const livraisonForm = await tx.forms.create({
                data: {
                    type: 'livraison_tpe_repare',
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    nom_user: utilisateur.fullname,
                    commentaire,
                },
            })
            const livraison = await tx.livraison_tpe_repare.create({
                data: {
                    form_id: livraisonForm.id,
                    reparation_id: lot.id,
                    statut: 'en_cours',
                    quantite: listeValidee.length,
                    liste_sn: JSON.stringify(listeValidee),
                },
            })
            await tx.reparation_tpe.update({
                where: { id: lot.id },
                data: { statut: 'livre' },
            })
            const decomStatut = await avancerDecomReparation(tx, lot.decom_id)
            return { livraisonForm, livraison, decomStatut }
        })

        const paragraphes = [`Un lot de TPE réparés (lot ${lot.id}) a été livré par ${utilisateur.fullname}.`]
        if (operation.decomStatut) {
            paragraphes.push(`Tous les TPE réparés du décommissionnement ${lot.decom_id} sont en livraison.`)
        }
        await notifierRoles(
            lot.decom_id
                ? [ROLE_RECEPTION_REPARATION, ROLE_SUPERVISION_REPARATION, ROLE_SUPERVISION_DECOM]
                : [ROLE_RECEPTION_REPARATION, ROLE_SUPERVISION_REPARATION],
            `SYSLIS - LIVRAISON TPE REPARE`,
            mailHtml(paragraphes, listeValidee.length, commentaire, lienLivraison(operation.livraison.id)),
        )

        console.log(`Lot de réparation ${lot.id} livré par ${utilisateur.username}`)
        res.status(201).json({
            message: 'Livraison des TPE réparés créée avec succès !',
            data: operation,
        });
    } catch (error) {
        console.error("Erreur lors de la livraison du lot de réparation :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

module.exports = {
    reparerListeTpe,
    getAllReparationTpe,
    getOneReparationTpe,
    validerReparationTpe,
    livrerReparationTpe,
    avancerDecomApresReceptionReparation,
    ROLE_RECEPTION_REPARATION,
}
