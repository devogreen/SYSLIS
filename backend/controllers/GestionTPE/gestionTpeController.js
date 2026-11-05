const TEST_ENV = require("../../utils/consts")

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const prisma = require('../../prisma/client');
const {
    toModelId,
    verifierModelesExistants,
    getTpesParc,
    creerTpesEtCompleterModeles,
    completerModelesManquants,
} = require("../../utils/parcTpeModele");

/*
 * CORRECTION DU MODÈLE — seul endroit où un modèle déjà enregistré au parc peut être remplacé.
 * Réservée au rôle 27 (vérifié côté serveur). Pas de table d'historique : chaque correction
 * est tracée dans le journal du serveur (ligne "[CORRECTION MODELE TPE]").
 */
const ROLE_CORRECTION_MODELE = 27

const toBoolean = (value) => value === true || value === 'true' || value === '1' || value === 1

const aLeRole = async (userId, roleId) => {
    const role = await prisma.user_roles.findFirst({
        where: { user_id: parseInt(userId), role_id: roleId },
    })
    return Boolean(role)
}

// TPE au parc dont le modèle enregistré diffère du modèle demandé : [{ serial, ancienModelId, nouveauModelId }]
const preparerCorrectionsModele = (items, tpesParc) => items
    .filter((item) => {
        const tpe = tpesParc.get(String(item.serial))
        const nouveau = toModelId(item.modelId)
        return tpe?.modelId && nouveau && tpe.modelId !== nouveau
    })
    .map((item) => ({
        serial: String(item.serial),
        ancienModelId: tpesParc.get(String(item.serial)).modelId,
        nouveauModelId: toModelId(item.modelId),
    }))

// Écrase le modèle (séquentiel, dans la transaction). last_modified_at n'est pas modifié :
// il reste la date du dernier changement de STATUT (utilisée pour les régularisations antidatées).
const appliquerCorrectionsModele = async (tx, corrections, utilisateur, dateAction) => {
    for (const correction of corrections) {
        await tx.parc_tpe.update({
            where: { serial_number: correction.serial },
            data: {
                model_id: correction.nouveauModelId,
                updated_by: utilisateur.id_user,
                updated_at: dateAction,
            },
        })
    }
}

// Trace serveur, écrite APRÈS la validation de la transaction (uniquement les corrections effectives)
const journaliserCorrectionsModele = async (corrections, utilisateur, dateAction) => {
    if (corrections.length === 0) return
    const ids = [...new Set(corrections.flatMap((c) => [c.ancienModelId, c.nouveauModelId]))]
    const modeles = await prisma.model_piece.findMany({ where: { id_model: { in: ids } }, select: { id_model: true, nom_model: true } })
    const nom = new Map(modeles.map((m) => [m.id_model, m.nom_model]))
    for (const c of corrections) {
        console.info(
            `[CORRECTION MODELE TPE] ${dateAction.toISOString()} | SN ${c.serial} | `
            + `${nom.get(c.ancienModelId)} (id ${c.ancienModelId}) -> ${nom.get(c.nouveauModelId)} (id ${c.nouveauModelId}) | `
            + `par ${utilisateur.fullname} (id ${utilisateur.id_user})`
        )
    }
}

// Contrôle du modèle pour la manipulation manuelle des TPE :
// - obligatoire pour un TPE pas encore au parc (il y est créé) ;
// - pour un TPE déjà au parc sans modèle, il est complété ; un modèle existant n'est jamais écrasé.
// items = [{ serial, modelId }]. Retourne un message d'erreur, ou null.
const controlerModelesManipulation = async (items) => {
    const tpesParc = await getTpesParc(prisma, items.map((item) => item.serial))
    const sansModele = items.filter((item) => !tpesParc.has(String(item.serial)) && !toModelId(item.modelId))
    if (sansModele.length > 0) {
        const liste = sansModele.slice(0, 10).map((item) => item.serial).join(", ")
        return `Modèle obligatoire pour les TPE non enregistrés au parc : ${liste}${sansModele.length > 10 ? ` (+${sansModele.length - 10})` : ""}`
    }
    return verifierModelesExistants(prisma, items)
}
const cloudinary = require("../../config/clouddinaryConifg");
const { get } = require("http");
const { urlToHttpOptions } = require("url");
const { type } = require("os");
const sendMail = require("../../utils/emailSender");
const archiver = require("archiver");
const ExcelJS = require("exceljs");

const formatDate = (isoDate) => {
    const date = new Date(isoDate);
    return date.toLocaleString("fr-FR", {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

// baseUrl est l'addresse du site de livraison
const baseUrl = process.env.FRONTEND_BASE_URL || "https://livraisons.greenpayci.com";
// localUrl est l'addresse en local pour les tests
const localUrl = "http://localhost:5173"
// GENERAL_URL va être utilisée dans les mails envoyés pour pouvoir rediriger correctement l'utilisateur vers la page avec le bon lien
// En test GENERAL_URL doit avoir la valeur de localUrl et celle de baseUrl lors du deploiement.
let GENERAL_URL = baseUrl
let test_env = TEST_ENV
if (test_env) {
    GENERAL_URL = localUrl
}


const getParcTpe = async (req, res) => {
    try {
        const listeTpe = await prisma.parc_tpe.findMany({
            include: {
                users_create_tpe: true,
                users_update_tpe: true,
                statut_tpe: true,
                history_tpe: {
                    include: {
                        users: true,
                        forms: true,
                        stocks: true,
                    },
                },
            },
            orderBy: {
                last_modified_at: 'desc'
            },
        })
        res.status(200).json(listeTpe);
    } catch (error) {
        console.error("Erreur lors de la récupération des TPEs du parc :", error)
        res.status(500).json({ message: "Erreur lors de la récupération des TPEs du parc", error });
    }
}

const getAllStatut = async (req, res) => {
    try {
        const status = await prisma.statut_tpe.findMany({
            include: {
                parc_tpe: true,
                history_tpe: true,
            },
        })
        res.status(200).json(status);
    } catch (error) {
        console.error("Erreur lors de la récupération des statuts TPEs du parc :", error)
        res.status(500).json({ message: "Erreur lors de la récupération des statuts TPEs du parc", error });
    }
}

const getTpeHistory = async (req, res) => {
    try {
        const {
            id
        } = req.params

        const history = await prisma.history_tpe.findMany({
            where: {
                id_tpe: parseInt(id),
            },
            include: {
                users: true,
                stocks: true,
                statut_tpe: true,
                forms: true,
            },
            orderBy: {
                created_at: 'desc'
            },

        })
        res.status(200).json(history);
    } catch (error) {
        console.error("Erreur lors de la récupération de l'historique du TPE :", error)
        res.status(500).json({ message: "Erreur lors de la récupération de l'historique du TPE", error });
    }
}

const getTpeInfos = async (req, res) => {
    try {
        const {
            sn,
        } = req.params

        const tpe = await prisma.parc_tpe.findUnique({
            where: {
                serial_number: sn,
            },
            include: {
                users_create_tpe: true,
                users_update_tpe: true,
                statut_tpe: true,
                model_piece: true,
                history_tpe: {
                    include: {
                        users: true,
                        forms: true,
                        stocks: true,
                    },
                },
            },
        })
        res.status(200).json(tpe);
    } catch (error) {
        console.error("Erreur lors de la récupération du TPE :", error)
        res.status(500).json({ message: "Erreur lors de la récupération du TPE", error });
    }
}

const changeTpeStatut = async (req, res) => {
    try {
        const {
            sn: terminalSn,
        } = req.params
        const {
            statutId,
            userId,
            modelId,
            corrigerModele,  // true : remplacer le modèle enregistré au parc (rôle 27)
        } = req.body

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId),
            },
        })
        if (!utilisateur) {
            console.error('Utilisateur non enregistré !')
            return res.status(404).json({ message: "Utilisateur non enregistré !" });
        }

        const corriger = toBoolean(corrigerModele)
        const changerStatut = Boolean(toModelId(statutId)) // id de statut > 0
        if (!changerStatut && !corriger) {
            return res.status(400).json({ message: "Vous devez choisir un statut !" });
        }
        if (corriger) {
            if (!(await aLeRole(utilisateur.id_user, ROLE_CORRECTION_MODELE))) {
                console.error(`Correction de modèle refusée pour ${utilisateur.username} (rôle ${ROLE_CORRECTION_MODELE} requis)`)
                return res.status(403).json({ message: "Vous n'êtes pas autorisé à corriger le modèle d'un TPE !" });
            }
            if (!toModelId(modelId)) {
                return res.status(400).json({ message: "Vous devez choisir le nouveau modèle du TPE !" });
            }
        }

        const terminal = { serial: terminalSn, modelId: toModelId(modelId) }
        const erreurModele = await controlerModelesManipulation([terminal])
        if (erreurModele) {
            console.error(erreurModele)
            return res.status(400).json({ message: erreurModele });
        }

        const tpesParc = await getTpesParc(prisma, [terminalSn])
        if (!changerStatut && !tpesParc.has(terminalSn)) {
            return res.status(400).json({ message: "Ce TPE n'est pas enregistré au parc : choisissez un statut pour le créer." });
        }
        const corrections = corriger ? preparerCorrectionsModele([terminal], tpesParc) : []
        if (!changerStatut && corrections.length === 0 && tpesParc.get(terminalSn)?.modelId) {
            return res.status(400).json({ message: "Le TPE a déjà ce modèle : rien à modifier." });
        }
        const dateAction = new Date()

        const modification = await prisma.$transaction(async (tx) => {
            const existant = tpesParc.has(terminalSn)

            if (changerStatut) {
                // Création (avec modèle) si absent ; complément du modèle si le TPE n'en a pas
                await creerTpesEtCompleterModeles(tx, [terminal], {
                    created_at: dateAction,
                    created_by: utilisateur.id_user,
                    last_modified_at: dateAction,
                    statut_id: parseInt(statutId),
                })
                if (existant) {
                    await tx.parc_tpe.update({
                        where: {
                            serial_number: terminalSn,
                        },
                        data: {
                            updated_at: dateAction,
                            updated_by: utilisateur.id_user,
                            last_modified_at: dateAction,
                            statut_id: parseInt(statutId),
                        },
                    })
                }
            } else {
                await completerModelesManquants(tx, [terminal])
            }

            // Correction du modèle enregistré (rôle 27)
            await appliquerCorrectionsModele(tx, corrections, utilisateur, dateAction)

            const tpe = await tx.parc_tpe.findUnique({ where: { serial_number: terminalSn } })

            if (changerStatut) {
                await tx.history_tpe.create({
                    data: {
                        id_tpe: tpe.id,
                        created_at: dateAction,
                        created_by: utilisateur.id_user,
                        statut_id: parseInt(statutId),
                    }
                })
            }

            return {
                tpe,
                corrections,
            }
        })
        await journaliserCorrectionsModele(corrections, utilisateur, dateAction)

        console.log('Opération effectuée avec succès !')
        res.status(201).json({
            message: 'Opération effectuée avec succès !',
            data: modification,
        });
    } catch (error) {
        console.error("Erreur lors de l'opération :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

function getCellValue(cell) {
    if (!cell || cell.value == null) return "";
    if (typeof cell.value === "object" && cell.value.richText) {
        return cell.value.richText.map(t => t.text).join("");
    }
    return String(cell.value).trim();
}
const normalize = (value) => {
    if (value === null || value === undefined) return null;
    return String(value).trim();
};


const extractSn = async (req, res) => {
    try {
        const {
            userId,
        } = req.body

        // Le fichier excel est récupéré ici
        const file = req.file
        // console.log("Fichier reçu : ", file)

        if (!file) {
            console.log("Aucun fichier reçu")
            return res.status(400).json({ message: "Excel file is required" });
        }

        // JAVASCRIPT utilise ExcelJS pour lire comme il faut les fichiers excel
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
            console.log("Aucune feuille trouvée dans le fichier Excel")
            return res.status(400).json({ message: "Invalid Excel file" });
        }

        // Récupération des en-têtes 
        const headers = {};
        worksheet.getRow(1).eachCell((cell, col) => {
            headers[String(cell.value).trim().toUpperCase()] = col;
        });

        const requireHeader = "SERIAL NUMBER"

        if (!headers[requireHeader]) {
            console.log(`Colonne requise manquante : ${requireHeader}`)
            return res.status(400).json({
                message: `Missing required column: ${requireHeader}`
            });
        }

        const serials = [];
        const snSet = new Set()
        const modeleExcelParSn = new Map() // colonne MODELE optionnelle
        let duplicateError = null;
        let formatError = null;
        const isOnlyDigits = (str) => /^\d+$/.test(str);
        const cleModele = (valeur) => String(valeur ?? "")
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "").toUpperCase()
        const colonneModele = headers["MODELE"] || headers["MODÈLE"]

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const sn = normalize(row.getCell(headers[requireHeader]).value);
            if (!sn) return;

            if (snSet.has(sn)) {
                duplicateError = {
                    rowNumber,
                    sn,
                };
                return;
            }
            if (sn.length != 10 || !isOnlyDigits(sn)) {
                formatError = {
                    rowNumber,
                    sn,
                };
                return;
            }

            snSet.add(sn)
            if (colonneModele) {
                const modele = getCellValue(row.getCell(colonneModele))
                if (modele) modeleExcelParSn.set(sn, { rowNumber, modele })
            }
            // console.log("Données extraites ligne", rowNumber, marchand);
        })

        if (formatError) {
            return res.status(400).json({
                message: `SN invalide à la ligne ${formatError.rowNumber} pour le SN ${formatError.sn}`,
            });
        }
        if (duplicateError) {
            return res.status(400).json({
                message: `Doublon trouvé à la ligne ${duplicateError.rowNumber} pour le SN ${duplicateError.sn}`,
            });
        }

        const listeSn = [...snSet]

        // Modèles connus (comparaison sans espaces ni accents : "A920 Pro" == "A920PRO")
        const modeles = await prisma.model_piece.findMany({ select: { id_model: true, nom_model: true } })
        const modeleParNom = new Map(modeles.filter((m) => m.nom_model).map((m) => [cleModele(m.nom_model), m]))

        // Une seule requête pour tous les SN (statut actuel + modèle enregistré au parc)
        const tpesParc = listeSn.length ? await prisma.parc_tpe.findMany({
            where: { serial_number: { in: listeSn } },
            include: { statut_tpe: true, model_piece: true },
        }) : []
        const parcParSn = new Map(tpesParc.map((t) => [t.serial_number, t]))

        for (let sn of listeSn) {
            const tpe = parcParSn.get(sn)
            const excel = modeleExcelParSn.get(sn)

            // Modèle indiqué dans le fichier (vérifié même si le TPE a déjà un modèle : il peut servir à le corriger)
            let modeleFichier = null
            if (excel) {
                modeleFichier = modeleParNom.get(cleModele(excel.modele))
                if (!modeleFichier) {
                    return res.status(400).json({
                        message: `Modèle "${excel.modele}" invalide à la ligne ${excel.rowNumber} pour le SN ${sn}. Modèles possibles : ${modeles.map((m) => m.nom_model).filter(Boolean).join(", ")}.`,
                    });
                }
            }

            // Modèle retenu : celui du parc fait foi, sinon celui du fichier
            const modeleId = tpe?.model_id || modeleFichier?.id_model || null
            const nomModele = tpe?.model_id ? (tpe.model_piece?.nom_model || null) : (modeleFichier?.nom_model || null)
            serials.push({
                sn,
                statut: tpe ? tpe.statut_tpe.statut : 'non enregistré',
                enregistre: Boolean(tpe),
                modele_id: modeleId,
                modele: nomModele,
                modele_parc: Boolean(tpe?.model_id),
                modele_fichier_id: modeleFichier?.id_model || null,
                modele_fichier: modeleFichier?.nom_model || null,
                // Le fichier indique un autre modèle que celui du parc (corrigeable avec le rôle 27)
                conflit_modele: Boolean(tpe?.model_id && modeleFichier && modeleFichier.id_model !== tpe.model_id),
            })
        }
        // const serialList = [...serials]
        // console.log(serials)
        console.log(`Extraction complète par utilisateur ${userId} !`)
        return res.status(201).json({
            message: "Extraction complète",
            data: serials,
        });
    } catch (error) {
        console.error("Erreur lors de l'extraction du fichier Excel :", error);
        return res.status(500).json({ message: "Erreur interne", error });
    }
}

const changeListeStatut = async (req, res) => {
    try {
        const {
            statutId,
            userId,
            serials,
            terminaux,  // optionnel : [{ sn, modelId }] (modèle par SN, ex. colonne MODELE du fichier Excel)
            modelId,    // optionnel : modèle par défaut pour les SN sans modèle
            corrigerModele, // true : le modèle par SN (terminaux) remplace celui du parc (rôle 27)
        } = req.body

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId),
            },
        })
        if (!utilisateur) {
            console.error('Utilisateur non enregistré !')
            return res.status(404).json({ message: "Utilisateur non enregistré !" });
        }
        if (!Array.isArray(serials) || serials.length == 0) {
            console.error('Liste vide !')
            return res.status(400).json({ message: "Liste vide !" });
        }

        const corriger = toBoolean(corrigerModele)
        const changerStatut = Boolean(toModelId(statutId)) // id de statut > 0
        if (!changerStatut && !corriger) {
            return res.status(400).json({ message: "Vous devez choisir un statut !" });
        }
        if (corriger && !(await aLeRole(utilisateur.id_user, ROLE_CORRECTION_MODELE))) {
            console.error(`Correction de modèle refusée pour ${utilisateur.username} (rôle ${ROLE_CORRECTION_MODELE} requis)`)
            return res.status(403).json({ message: "Vous n'êtes pas autorisé à corriger le modèle d'un TPE !" });
        }

        const modeleParSn = new Map((Array.isArray(terminaux) ? terminaux : [])
            .map((t) => [String(t.sn), toModelId(t.modelId)]))
        const items = serials.map((sn) => ({
            serial: String(sn),
            modelId: modeleParSn.get(String(sn)) || toModelId(modelId),
        }))
        const erreurModele = await controlerModelesManipulation(items)
        if (erreurModele) {
            console.error(erreurModele)
            return res.status(400).json({ message: erreurModele });
        }

        const tpesParc = await getTpesParc(prisma, items.map((item) => item.serial))
        if (!changerStatut) {
            const absents = items.filter((item) => !tpesParc.has(item.serial))
            if (absents.length > 0) {
                return res.status(400).json({ message: `TPE non enregistrés au parc : choisissez un statut pour les créer (${absents.slice(0, 10).map((item) => item.serial).join(", ")}${absents.length > 10 ? ` +${absents.length - 10}` : ""}).` });
            }
        }
        // Seul le modèle donné PAR SN (fichier) peut corriger le parc, jamais le modèle par défaut
        const corrections = corriger
            ? preparerCorrectionsModele(items.filter((item) => modeleParSn.get(item.serial)), tpesParc)
            : []
        const completions = items.filter((item) => item.modelId && !tpesParc.get(item.serial)?.modelId)
        if (!changerStatut && corrections.length === 0 && completions.length === 0) {
            return res.status(400).json({ message: "Aucun modèle à corriger : rien à modifier." });
        }
        const dateAction = new Date()

        const modification = await prisma.$transaction(async (tx) => {
            if (!changerStatut) {
                // Correction / complément du modèle uniquement : statut et historique inchangés
                await completerModelesManquants(tx, items)
                await appliquerCorrectionsModele(tx, corrections, utilisateur, dateAction)
                return { allTpes: [], corrections }
            }

            // 1. Créer les TPE manquants avec leur modèle, compléter le modèle des TPE existants sans modèle
            await creerTpesEtCompleterModeles(tx, items, {
                created_by: utilisateur.id_user,
                created_at: dateAction,
                last_modified_at: dateAction,
                statut_id: parseInt(statutId),
            });

            // Correction du modèle enregistré (rôle 27)
            await appliquerCorrectionsModele(tx, corrections, utilisateur, dateAction)

            // 2. Update ALL (existing + newly created)
            await tx.parc_tpe.updateMany({
                where: {
                    serial_number: { in: serials }
                },
                data: {
                    updated_by: utilisateur.id_user,
                    updated_at: dateAction,
                    last_modified_at: dateAction,
                    statut_id: parseInt(statutId),
                }
            });

            // Récupérer tous les TPE du parc maintenant qu'ils sont créés ou updated
            const allTpes = await tx.parc_tpe.findMany({
                where: {
                    serial_number: { in: serials }
                },
                select: {
                    id: true,
                    serial_number: true
                }
            });

            // Créer les nouveaux historiques pour chaque TPE mis à jour ou nouvellement créé
            await tx.history_tpe.createMany({
                data: allTpes.map(tpe => ({
                    id_tpe: tpe.id,
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    statut_id: parseInt(statutId),
                }))
            });

            return {
                allTpes,
                corrections,
            }
        })
        await journaliserCorrectionsModele(corrections, utilisateur, dateAction)

        console.log('Liste de SN modifiée avec succès !')
        res.status(201).json({
            message: 'Liste de SN modifiée avec succès !',
            data: modification,
        });
    } catch (error) {
        console.error("Erreur lors de la modification :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const getTpe = async (req, res) => {
    try {
        const {
            id,
        } = req.params

        const tpe = await prisma.parc_tpe.findUnique({
            where: {
                id: parseInt(id),
            },
            include: {
                users_create_tpe: true,
                users_update_tpe: true,
                statut_tpe: true,
                model_piece: true,
                history_tpe: {
                    include: {
                        users: true,
                        forms: true,
                        stocks: true,
                    },
                },
            },
        })
        res.status(200).json(tpe);
    } catch (error) {
        console.error("Erreur lors de la récupération du TPE :", error)
        res.status(500).json({ message: "Erreur lors de la récupération du TPE", error });
    }
}

const exportTpeToExcel = async (req, res) => {
    try {
        const {
            serials,
            userId,
        } = req.body

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId),
            },
        })

        if (!utilisateur) {
            console.error('Utilisateur non enregistré !')
            return res.status(404).json({ message: "Utilisateur non enregistré !" });
        }

        const listeIds =
            typeof serials === "string" ? JSON.parse(serials) : serials;
        if (!Array.isArray(listeIds) || listeIds.length === 0) {
            console.error("Liste de sn vide ou invalide.");
            return res.status(400).json({ message: "Liste de sn vide ou invalide." });
        }

        const tpes = await prisma.parc_tpe.findMany({
            where: {
                id: { in: listeIds }
            },
            include: {
                statut_tpe: true,
            },
        })

        const workbook = new ExcelJS.Workbook();

        const serialsSheet = workbook.addWorksheet('TPE - Statuts');
        const serialsHeaders = [
            "ID",
            "S/N",
            "Statut",
            "Dernière Modification",
            "Date Création",       
        ];
        const serialsHeaderRow = serialsSheet.addRow(serialsHeaders);
        serialsHeaderRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
            cell.alignment = { vertical: "middle", horizontal: "center" };
        });

        tpes.forEach((item, index) => {
            serialsSheet.addRow([
                item.id,
                item.serial_number,
                item.statut_tpe.statut,
                new Date(item.updated_at),
                new Date(item.created_at),
            ])
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=parc_tpe_${new Date().toISOString()}.xlsx`
        );
        res.send(buffer);

        console.log(`Exportation des TPE vers Excel par utilisateur ${utilisateur.username} !`)

    } catch (error) {
        console.error("Erreur lors de l'exportation des TPE vers Excel :", error);
        res.status(500).json({ message: "Erreur lors de l'exportation des TPE vers Excel", error });
    }
}
// POST /api/gestion-tpe/checkSerials
// Body : { serials: ["3210040373", ...] }
// Vérification générique d'une liste de S/N contre le parc : existence + statut actuel.
// Réutilisable par toute page qui importe une liste de S/N (livraisons, rebuts, réparations...).
const MAX_CHECK_SERIALS = 5000
const checkSerials = async (req, res) => {
    try {
        const { serials } = req.body
        const liste = typeof serials === "string" ? JSON.parse(serials) : serials

        if (!Array.isArray(liste) || liste.length === 0) {
            return res.status(400).json({ message: "Liste de S/N vide ou invalide." });
        }

        // Normalisation + dédoublonnage (insensible à la casse / aux espaces)
        const parCle = new Map()
        liste.forEach((item) => {
            const sn = normalize(item)?.replace(/\s+/g, '')
            if (sn) parCle.set(sn.toUpperCase(), sn)
        })
        const serialsUniques = [...parCle.values()]

        if (serialsUniques.length > MAX_CHECK_SERIALS) {
            return res.status(400).json({ message: `Maximum ${MAX_CHECK_SERIALS} S/N par vérification.` });
        }

        const tpes = await prisma.parc_tpe.findMany({
            where: { serial_number: { in: serialsUniques } },
            select: {
                id: true,
                serial_number: true,
                statut_id: true,
                is_deleted: true,
                statut_tpe: { select: { statut: true } },
                model_piece: { select: { nom_model: true } },
            },
        })
        const tpeParCle = new Map(tpes.map((t) => [String(t.serial_number).toUpperCase(), t]))

        const resultat = serialsUniques.map((sn) => {
            const tpe = tpeParCle.get(sn.toUpperCase())
            if (!tpe || tpe.is_deleted) {
                return { sn, exists: false, tpe_id: null, statut_id: null, statut: null, modele: null }
            }
            return {
                sn: tpe.serial_number,
                exists: true,
                tpe_id: tpe.id,
                statut_id: tpe.statut_id,
                statut: tpe.statut_tpe?.statut || null,
                modele: tpe.model_piece?.nom_model || null,
            }
        })

        return res.status(200).json({ message: "Vérification effectuée", data: resultat });
    } catch (error) {
        console.error("Erreur lors de la vérification des S/N :", error);
        return res.status(500).json({ message: "Erreur lors de la vérification des S/N", error });
    }
}

module.exports = {
    checkSerials,
    getParcTpe,
    getAllStatut,
    getTpeHistory,
    getTpeInfos,
    changeTpeStatut,
    extractSn,
    changeListeStatut,
    getTpe,
    exportTpeToExcel,
}