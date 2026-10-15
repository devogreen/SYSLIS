const TEST_ENV = require("../../utils/consts")

const prisma = require('../../prisma/client');
const sendMail = require("../../utils/emailSender");

const configEmail = process.env.NODEMAILER_USER

// baseUrl est l'addresse du site de livraison
const baseUrl = process.env.FRONTEND_BASE_URL || "https://livraisons.greenpayci.com";
// localUrl est l'addresse en local pour les tests
const localUrl = "http://localhost:5173"
// GENERAL_URL est utilisée dans les mails pour rediriger l'utilisateur vers la bonne page
let GENERAL_URL = baseUrl
if (TEST_ENV) {
    GENERAL_URL = localUrl
}

/*************************************************************************
 *  LIVRAISON DES TPE EN PARAMETRAGE MAINTENANCE (param_maintenance)
 *
 *  - Création : rôle 25 (verification_decom / maintenance)
 *  - Réception + clôture : rôle 36 (reception_reparation)
 *  - A la clôture, les TPE reçus passent de param_maintenance (13) à parametrage (4)
 *
 *  Si la livraison est faite depuis un décom :
 *  - clos -> transmis_decom_param quand TOUS les TPE param du décom sont livrés
 *  - transmis_decom_param -> reception_decom_param quand TOUS ont été reçus
 *************************************************************************/

const ROLE_VERIFICATION_DECOM = 25
const ROLE_SUPERVISION_DECOM = 26
const ROLE_RECEPTION_REPARATION = 36

const STATUT_PARAM_MAINTENANCE = 13
const STATUT_PARAMETRAGE = 4

// Statuts de livraison qui "bloquent" un TPE (il ne peut pas être livré une seconde fois)
const STATUTS_LIVRAISON_OUVERTE = ['en_cours', 'livre']

/* --------------------------------- Helpers -------------------------------- */

const hasRole = async (userId, roleId) => {
    const role = await prisma.user_roles.findFirst({
        where: { user_id: userId, role_id: roleId },
    })
    return Boolean(role)
}

// Envoie un mail (en CCI) aux utilisateurs des rôles donnés, sans faire échouer la requête
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

// S/N déjà présents dans une livraison param encore ouverte (en cours ou livrée non clôturée)
const getSnLivraisonsOuvertes = async (client = prisma) => {
    const livraisons = await client.livraison_param_decom.findMany({
        where: { statut: { in: STATUTS_LIVRAISON_OUVERTE } },
        select: { liste_sn: true },
    })
    const set = new Set()
    livraisons.forEach((l) => parseListe(l.liste_sn).forEach((item) => set.add(snDe(item))))
    return set
}

// S/N des TPE du décom diagnostiqués "parametrage" lors de la vérification technique
const getSnParamDecom = async (decomId, client = prisma) => {
    const lignes = await client.sn_decom.findMany({
        where: { decom_id: decomId, is_deleted: false, statut: 'parametrage' },
        select: { serial_number: true },
    })
    return [...new Set(lignes.map((l) => String(l.serial_number)))]
}

const lienLivraison = (id) => `${GENERAL_URL}/livraison-param-decom-details/${id}`

const mailHtml = (paragraphes, nombre, commentaire, lien) => `
    <p>Bonjour,</p>
    ${paragraphes.map((p) => `<p>${p}</p>`).join('')}
    <ul>
    <li><strong>Nombre de TPE :</strong> ${nombre}</li>
    </ul>
    <br>
    <p>Commentaire : ${commentaire ? commentaire : '(sans commentaire)'}<p>
    <br>
    <p>Retrouvez la livraison à ce lien :
    <span>
    <a href="${lien}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
        Cliquez ici !
    </a>
    </span>
    </p>
    <br><br>
    <p>Green - Pay vous remercie.</p>
`

/* ------------------------------ TPE disponibles ----------------------------- */

// GET /getTpeParamMaintenance?decomId=12
// TPE au statut param_maintenance qui ne sont pas déjà dans une livraison ouverte.
// Avec decomId : uniquement les TPE "parametrage" de ce décom.
const getTpeParamMaintenance = async (req, res) => {
    try {
        const decomId = req.query.decomId ? parseInt(req.query.decomId) : null

        let filtreSn = null
        if (decomId) {
            filtreSn = await getSnParamDecom(decomId)
            if (filtreSn.length == 0) {
                return res.status(200).json([])
            }
        }

        const tpes = await prisma.parc_tpe.findMany({
            where: {
                statut_id: STATUT_PARAM_MAINTENANCE,
                is_deleted: false,
                ...(filtreSn ? { serial_number: { in: filtreSn } } : {}),
            },
            select: {
                id: true,
                serial_number: true,
                model_piece: { select: { nom_model: true } },
            },
            orderBy: { last_modified_at: 'desc' },
        })

        const dejaEnLivraison = await getSnLivraisonsOuvertes()
        const disponibles = tpes.filter((t) => !dejaEnLivraison.has(String(t.serial_number)))

        // Infos du dernier décom de chaque TPE (point marchand, n° de décom)
        const serials = disponibles.map((t) => t.serial_number)
        const lignesDecom = serials.length ? await prisma.sn_decom.findMany({
            where: { serial_number: { in: serials }, is_deleted: false },
            select: { serial_number: true, point_marchand: true, decom_id: true, id: true },
            orderBy: { id: 'desc' },
        }) : []
        const decomParSn = new Map()
        lignesDecom.forEach((l) => {
            if (!decomParSn.has(l.serial_number)) decomParSn.set(l.serial_number, l)
        })

        const resultat = disponibles.map((t) => {
            const infoDecom = decomParSn.get(t.serial_number)
            return {
                tpe_id: t.id,
                sn: t.serial_number,
                modele: t.model_piece?.nom_model || null,
                point_marchand: infoDecom?.point_marchand || null,
                decom_id: infoDecom?.decom_id || null,
            }
        })

        res.status(200).json(resultat)
    } catch (error) {
        console.error("Erreur lors de la récupération des TPE en param maintenance :", error)
        res.status(500).json({ message: "Erreur lors de la récupération des TPE en param maintenance", error });
    }
}

/* -------------------------------- Création --------------------------------- */

// POST /livrerParamDecom
const livrerParamDecom = async (req, res) => {
    try {
        const { userId, commentaire, listeSn, decomId } = req.body

        const utilisateur = await prisma.users.findUnique({
            where: { id_user: parseInt(userId) },
        })
        if (!utilisateur) {
            console.error('Utilisateur non enregistré !')
            return res.status(404).json({ message: "Utilisateur non enregistré !" });
        }
        if (!(await hasRole(utilisateur.id_user, ROLE_VERIFICATION_DECOM))) {
            console.error(`Utilisateur ${utilisateur.username} non autorisé à livrer des TPE param !`)
            return res.status(403).json({ message: "Vous n'êtes pas autorisé à faire cette livraison !" });
        }

        // Dédoublonnage par S/N
        const parSn = new Map()
        parseListe(listeSn).forEach((item) => {
            const sn = snDe(item)
            if (sn) parSn.set(sn, { ...item, sn })
        })
        const details = [...parSn.values()]
        if (details.length == 0) {
            return res.status(400).json({ message: "Aucun TPE sélectionné !" });
        }
        const serials = details.map((d) => d.sn)

        // Tous les TPE doivent être en param_maintenance
        const tpes = await prisma.parc_tpe.findMany({
            where: { serial_number: { in: serials }, is_deleted: false },
            select: { serial_number: true, statut_id: true },
        })
        const statutParSn = new Map(tpes.map((t) => [t.serial_number, t.statut_id]))
        const nonConformes = serials.filter((sn) => statutParSn.get(sn) !== STATUT_PARAM_MAINTENANCE)
        if (nonConformes.length > 0) {
            return res.status(400).json({ message: `TPE non disponibles pour le paramétrage : ${nonConformes.join(', ')}` });
        }

        // Aucun TPE ne doit déjà être dans une livraison ouverte
        const dejaEnLivraison = await getSnLivraisonsOuvertes()
        const doublons = serials.filter((sn) => dejaEnLivraison.has(sn))
        if (doublons.length > 0) {
            return res.status(400).json({ message: `TPE déjà en cours de livraison : ${doublons.join(', ')}` });
        }

        // Livraison depuis un décom
        let decom = null
        let snParamDecom = []
        if (decomId) {
            decom = await prisma.form_decom.findUnique({
                where: { id: parseInt(decomId) },
                include: { forms: true },
            })
            if (!decom || decom.forms?.is_deleted) {
                return res.status(404).json({ message: "Décommissionnement introuvable !" });
            }
            if (decom.statut != 'clos') {
                return res.status(400).json({ message: "La livraison param n'est possible que sur un décommissionnement clôturé !" });
            }
            snParamDecom = await getSnParamDecom(decom.id)
            const horsDecom = serials.filter((sn) => !snParamDecom.includes(sn))
            if (horsDecom.length > 0) {
                return res.status(400).json({ message: `TPE n'appartenant pas aux TPE param du décom : ${horsDecom.join(', ')}` });
            }
        }

        const dateAction = new Date()

        const operation = await prisma.$transaction(async (tx) => {
            const livraisonForm = await tx.forms.create({
                data: {
                    type: 'livraison_param_decom',
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    nom_user: utilisateur.fullname,
                    commentaire,
                }
            })
            const livraison = await tx.livraison_param_decom.create({
                data: {
                    form_id: livraisonForm.id,
                    decom_id: decom ? decom.id : null,
                    statut: 'en_cours',
                    quantite: details.length,
                    liste_sn: JSON.stringify(details),
                }
            })

            // Le décom n'avance que si TOUS ses TPE param sont dans une livraison (non annulée)
            let decomAvance = false
            if (decom) {
                const livraisonsDecom = await tx.livraison_param_decom.findMany({
                    where: { decom_id: decom.id, statut: { not: 'annule' } },
                    select: { liste_sn: true },
                })
                const livres = new Set()
                livraisonsDecom.forEach((l) => parseListe(l.liste_sn).forEach((item) => livres.add(snDe(item))))
                if (snParamDecom.every((sn) => livres.has(sn))) {
                    await tx.form_decom.update({
                        where: { id: decom.id },
                        data: { statut: 'transmis_decom_param' },
                    })
                    decomAvance = true
                }
            }

            return { livraisonForm, livraison, decomAvance }
        })

        const paragraphes = [`Une livraison de TPE à paramétrer a été créée par ${utilisateur.fullname}.`]
        if (decom) {
            paragraphes.push(operation.decomAvance
                ? `Tous les TPE à paramétrer du décommissionnement ${decom.id} sont désormais en livraison.`
                : `Livraison partielle des TPE à paramétrer du décommissionnement ${decom.id}.`)
        }
        await notifierRoles(
            [ROLE_RECEPTION_REPARATION, ROLE_SUPERVISION_DECOM],
            `SYSLIS - LIVRAISON TPE PARAMETRAGE`,
            mailHtml(paragraphes, details.length, commentaire, lienLivraison(operation.livraison.id)),
        )

        console.log(`Livraison param ${operation.livraison.id} créée par ${utilisateur.username}`)
        res.status(201).json({
            message: 'Livraison des TPE à paramétrer créée avec succès !',
            data: operation,
        });
    } catch (error) {
        console.error("Erreur lors de la création de la livraison param :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

/* -------------------------------- Lecture --------------------------------- */

const getAllLivraisonParamDecom = async (req, res) => {
    try {
        const livraisons = await prisma.livraison_param_decom.findMany({
            include: {
                forms: true,
                reception_param_decom: {
                    include: { forms: true },
                },
            },
            orderBy: {
                forms: { last_modified_at: 'desc' },
            },
        });
        res.status(200).json(livraisons);
    } catch (error) {
        console.error("Erreur lors de la récupération des livraisons param :", error)
        res.status(500).json({ message: "Erreur lors de la récupération des livraisons param", error });
    }
}

const getOneLivraisonParamDecom = async (req, res) => {
    try {
        const { id } = req.params
        const livraison = await prisma.livraison_param_decom.findUnique({
            where: { id: parseInt(id) },
            include: {
                forms: {
                    include: {
                        users_forms_created_byTousers: true,
                        users_forms_updated_byTousers: true,
                    },
                },
                reception_param_decom: {
                    include: { forms: true },
                },
                form_decom: {
                    select: { id: true, statut: true },
                },
            },
        })
        if (!livraison) {
            return res.status(404).json({ message: "Livraison introuvable !" });
        }
        res.status(200).json(livraison);
    } catch (error) {
        console.error("Erreur lors de la récupération de la livraison param : ", error)
        res.status(500).json({ message: "Erreur lors de la récupération de la livraison param", error });
    }
}

/* -------------------------------- Réception -------------------------------- */

// PUT /receptionLivraisonParamDecom/:id
const receptionLivraisonParamDecom = async (req, res) => {
    try {
        const { id } = req.params
        const { userId, commentaire, listeValidee } = req.body

        const livraison = await prisma.livraison_param_decom.findUnique({
            where: { id: parseInt(id) },
            include: { forms: true },
        })
        if (!livraison) {
            return res.status(404).json({ message: "Livraison introuvable !" });
        }
        if (livraison.forms?.is_deleted || livraison.statut == 'annule') {
            return res.status(400).json({ message: "Livraison annulée !" });
        }
        if (livraison.statut == 'livre' || livraison.statut == 'clos') {
            return res.status(400).json({ message: "Livraison déjà réceptionnée !" });
        }
        if (livraison.statut != 'en_cours') {
            return res.status(400).json({ message: "Statut de livraison non conforme !" });
        }

        const utilisateur = await prisma.users.findUnique({
            where: { id_user: parseInt(userId) },
        })
        if (!utilisateur) {
            return res.status(404).json({ message: "Utilisateur non enregistré !" });
        }
        if (!(await hasRole(utilisateur.id_user, ROLE_RECEPTION_REPARATION))) {
            console.error(`Utilisateur ${utilisateur.username} non autorisé à réceptionner une livraison param !`)
            return res.status(403).json({ message: "Vous n'êtes pas autorisé à réceptionner cette livraison !" });
        }

        // Seuls les TPE de la livraison peuvent être validés
        const listeLivraison = parseListe(livraison.liste_sn)
        const snLivraison = new Set(listeLivraison.map(snDe))
        const snValides = new Set(parseListe(listeValidee).map(snDe).filter((sn) => snLivraison.has(sn)))
        const detailsValides = listeLivraison.filter((item) => snValides.has(snDe(item)))
        if (detailsValides.length == 0) {
            return res.status(400).json({ message: "Vous devez valider au moins un TPE !" });
        }

        const dateAction = new Date()

        const operation = await prisma.$transaction(async (tx) => {
            const receptionForm = await tx.forms.create({
                data: {
                    type: 'reception_param_decom',
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    nom_user: utilisateur.fullname,
                    commentaire,
                }
            })
            const reception = await tx.reception_param_decom.create({
                data: {
                    form_id: receptionForm.id,
                    livraison_id: livraison.id,
                    type: 'reception',
                    quantite: detailsValides.length,
                    liste_sn: JSON.stringify(detailsValides),
                }
            })
            await tx.livraison_param_decom.update({
                where: { id: livraison.id },
                data: { statut: 'livre' },
            })

            // Le décom n'avance que si TOUS ses TPE param ont été reçus
            let decomAvance = false
            if (livraison.decom_id) {
                const decom = await tx.form_decom.findUnique({ where: { id: livraison.decom_id } })
                if (decom && decom.statut == 'transmis_decom_param') {
                    const snParamDecom = await getSnParamDecom(decom.id, tx)
                    const receptions = await tx.reception_param_decom.findMany({
                        where: {
                            type: 'reception',
                            livraison_param_decom: { decom_id: decom.id, statut: { not: 'annule' } },
                        },
                        select: { liste_sn: true },
                    })
                    const recus = new Set()
                    receptions.forEach((r) => parseListe(r.liste_sn).forEach((item) => recus.add(snDe(item))))
                    if (snParamDecom.every((sn) => recus.has(sn))) {
                        await tx.form_decom.update({
                            where: { id: decom.id },
                            data: { statut: 'reception_decom_param' },
                        })
                        decomAvance = true
                    }
                }
            }

            return { receptionForm, reception, decomAvance }
        })

        const paragraphes = [
            `${detailsValides.length} TPE sur ${listeLivraison.length} de la livraison param ${livraison.id} ont été réceptionnés par ${utilisateur.fullname}.`,
        ]
        if (operation.decomAvance) {
            paragraphes.push(`Tous les TPE à paramétrer du décommissionnement ${livraison.decom_id} ont été réceptionnés.`)
        }
        await notifierRoles(
            [ROLE_VERIFICATION_DECOM, ROLE_SUPERVISION_DECOM],
            `SYSLIS - RECEPTION TPE PARAMETRAGE`,
            mailHtml(paragraphes, detailsValides.length, commentaire, lienLivraison(livraison.id)),
        )

        console.log(`Réception de la livraison param ${livraison.id} par ${utilisateur.username}`)
        res.status(201).json({
            message: 'Livraison réceptionnée avec succès !',
            data: operation,
        });
    } catch (error) {
        console.error("Erreur lors de la réception de la livraison param :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

/* -------------------------------- Clôture --------------------------------- */

// PUT /cloturerLivraisonParamDecom/:id
// Les TPE reçus passent de param_maintenance (13) à parametrage (4)
const cloturerLivraisonParamDecom = async (req, res) => {
    try {
        const { id } = req.params
        const { userId, commentaire } = req.body

        const livraison = await prisma.livraison_param_decom.findUnique({
            where: { id: parseInt(id) },
            include: {
                forms: true,
                reception_param_decom: true,
            },
        })
        if (!livraison) {
            return res.status(404).json({ message: "Livraison introuvable !" });
        }
        if (livraison.forms?.is_deleted || livraison.statut == 'annule') {
            return res.status(400).json({ message: "Livraison annulée !" });
        }
        if (livraison.statut == 'clos') {
            return res.status(400).json({ message: "Livraison déjà clôturée !" });
        }
        if (livraison.statut != 'livre') {
            return res.status(400).json({ message: "La livraison doit être réceptionnée avant d'être clôturée !" });
        }

        const utilisateur = await prisma.users.findUnique({
            where: { id_user: parseInt(userId) },
        })
        if (!utilisateur) {
            return res.status(404).json({ message: "Utilisateur non enregistré !" });
        }
        if (!(await hasRole(utilisateur.id_user, ROLE_RECEPTION_REPARATION))) {
            console.error(`Utilisateur ${utilisateur.username} non autorisé à clôturer une livraison param !`)
            return res.status(403).json({ message: "Vous n'êtes pas autorisé à clôturer cette livraison !" });
        }

        // Liste reçue lors de la dernière réception
        const reception = livraison.reception_param_decom.filter((r) => r.type == 'reception').at(-1)
        const listeRecue = parseListe(reception?.liste_sn)
        if (listeRecue.length == 0) {
            return res.status(400).json({ message: "Aucun TPE réceptionné sur cette livraison !" });
        }
        const serials = listeRecue.map(snDe)

        const dateAction = new Date()

        const operation = await prisma.$transaction(async (tx) => {
            const clotureForm = await tx.forms.create({
                data: {
                    type: 'reception_param_decom',
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    nom_user: utilisateur.fullname,
                    commentaire,
                }
            })
            const cloture = await tx.reception_param_decom.create({
                data: {
                    form_id: clotureForm.id,
                    livraison_id: livraison.id,
                    type: 'cloture',
                    quantite: listeRecue.length,
                    liste_sn: JSON.stringify(listeRecue),
                }
            })
            await tx.livraison_param_decom.update({
                where: { id: livraison.id },
                data: { statut: 'clos' },
            })

            // Parc : param_maintenance -> parametrage (uniquement les TPE encore en param_maintenance)
            const tpes = await tx.parc_tpe.findMany({
                where: { serial_number: { in: serials }, statut_id: STATUT_PARAM_MAINTENANCE },
                select: { id: true },
            })
            if (tpes.length > 0) {
                await tx.parc_tpe.updateMany({
                    where: { id: { in: tpes.map((t) => t.id) } },
                    data: {
                        statut_id: STATUT_PARAMETRAGE,
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
                        statut_id: STATUT_PARAMETRAGE,
                        form_id: clotureForm.id,
                    })),
                })
            }

            return { clotureForm, cloture, tpesMisAJour: tpes.length }
        }, {
            maxWait: 10000,
            timeout: 30000,
        })

        await notifierRoles(
            [ROLE_VERIFICATION_DECOM, ROLE_SUPERVISION_DECOM],
            `SYSLIS - CLOTURE LIVRAISON TPE PARAMETRAGE`,
            mailHtml(
                [`La livraison param ${livraison.id} a été clôturée par ${utilisateur.fullname}. Les TPE reçus sont passés au statut paramétrage.`],
                listeRecue.length, commentaire, lienLivraison(livraison.id),
            ),
        )

        console.log(`Clôture de la livraison param ${livraison.id} par ${utilisateur.username}`)
        res.status(201).json({
            message: 'Livraison clôturée avec succès !',
            data: operation,
        });
    } catch (error) {
        console.error("Erreur lors de la clôture de la livraison param :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

module.exports = {
    getTpeParamMaintenance,
    livrerParamDecom,
    getAllLivraisonParamDecom,
    getOneLivraisonParamDecom,
    receptionLivraisonParamDecom,
    cloturerLivraisonParamDecom,
}
