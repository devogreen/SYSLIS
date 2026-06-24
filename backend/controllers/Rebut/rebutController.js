const TEST_ENV = require("../../utils/consts")

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
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

// Fonction pour télécharger le template servant à l'import des mise au rebut par excel
const downloadTemplateRebut = async (req, res) => {
    try {
        const {
            userId
        } = req.body

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId),
            },
            select: {
                id_user: true,
                username: true,
            },
        })

        const pieces = await prisma.items.findMany({
            where: {
                type: 'PIECE',
                is_deleted: false,
            }
        })
        const piecesMap = new Map(pieces.map(p => [p.id_piece, p.nom_piece]));

        const workbook = new ExcelJS.Workbook();

        const piecesHeaders = pieces.map((item) => {
            return item.nom_piece.toUpperCase()
        })

        const verificationSheet = workbook.addWorksheet('Liste rebut');
        const verificationHeaders = [
            "Point Marchand",
            "S/N",
            "Modele",
            "Observations",
            ...piecesHeaders,
        ];
        const verificationHeaderRow = verificationSheet.addRow(verificationHeaders);
        verificationHeaderRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
            cell.alignment = { vertical: "middle", horizontal: "center" };
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=template_rebut.xlsx`
        );
        res.send(buffer);

        console.log(`Template de mise au rebut téléchargé avec succès par ${utilisateur.username} ID ${utilisateur.id_user} !`);

    } catch (error) {
        console.error('Erreur downloadTemlateRebut:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
}

// Fonction pour extraire la valeur d'une cellule, en gérant les différents types de contenu (texte simple, texte enrichi, etc.)
function getCellValue(cell) {
    if (!cell || cell.value == null) return "";

    // Gestion du rich text
    if (typeof cell.value === "object" && cell.value.richText) {
        return cell.value.richText.map(t => t.text).join("").trim();
    }

    // Gestion des formules Excel
    if (typeof cell.value === "object" && cell.value.formula) {
        return cell.value.result ?? "";
    }

    return String(cell.value).trim();
}
const isOnlyDigits = (str) => /^\d+$/.test(str);

// Fonction pour extraire les données excel pour la mise au rebut
const extractRebut = async (req, res) => {
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

        const pieces = await prisma.items.findMany({
            where: {
                type: 'PIECE',
                is_deleted: false,
            }
        })
        const piecesMap = new Map(pieces.map(p => [p.nom_piece.toUpperCase(), p.id_piece]));

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

        const pieceColumns = [];

        Object.entries(headers).forEach(([header, colIndex]) => {
            const pieceId = piecesMap.get(header);

            if (pieceId) {
                pieceColumns.push({
                    colIndex,
                    pieceId,
                });
            }
        });

        const requiredHeaders = [
            "S/N",
            "MODELE",
        ];

        for (const header of requiredHeaders) {
            if (!headers[header]) {
                console.log(`Colonne requise manquante : ${header}`)
                return res.status(400).json({
                    message: `Missing required column: ${header}`
                });
            }
        }

        const terminals = [];
        const uniqueKeys = new Set();
        let duplicateError = null;
        let invalidSnRowError = null;
        let invalidModelRowError = null;
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const pointMarchand = String(getCellValue(row.getCell(headers["POINT MARCHAND"])) || "").trim();
            const terminalSN = String(getCellValue(row.getCell(headers["S/N"])) || "").trim();
            const model = String(getCellValue(row.getCell(headers["MODELE"])) || "").trim();
            const etatTpe = String(getCellValue(row.getCell(headers["OBSERVATIONS"])) || "").trim();
            const listePieceRec = [];
            const listePieceDef = [];
            for (const { colIndex, pieceId } of pieceColumns) {
                const etat = String(
                    getCellValue(row.getCell(colIndex)) || ""
                ).trim().toUpperCase();

                if (etat === "1" || etat === "OK") {
                    listePieceRec.push(pieceId);
                } else if (!etat || etat === "NOK" || etat === "0") {
                    listePieceDef.push(pieceId)
                }
            }

            // Ignore les lignes vides ou inutiles
            if (!terminalSN) {
                return;
            }
            if (terminalSN && (terminalSN.length != 10 || !isOnlyDigits(terminalSN))) {
                invalidSnRowError = {
                    rowNumber,
                    terminal: { terminalSN }
                };
                return;
            }
            if (terminalSN && !model) {
                invalidModelRowError = {
                    rowNumber,
                    terminal: { terminalSN }
                };
                return;
            }

            const terminal = {
                pointMarchand: pointMarchand ? pointMarchand : 'N/A',
                terminalSN,
                model,
                etatTpe,
                listePieceRec,
                listePieceDef,
            };

            const key = `${terminal.terminalSN}`;
            if (uniqueKeys.has(key)) {
                duplicateError = {
                    rowNumber,
                    terminal,
                };
                return;
            }
            uniqueKeys.add(key);
            terminals.push(terminal);

            // console.log("Données extraites ligne", rowNumber, marchand);
        })

        if (duplicateError) {
            return res.status(400).json({
                message: `Doublon de SN trouvé à la ligne ${duplicateError.rowNumber} pour le marchand avec le SN ${duplicateError.terminal.terminalSN}`,
            });
        }

        if (invalidSnRowError) {
            return res.status(400).json({
                message: `S/N invalide à la ligne ${invalidSnRowError.rowNumber} pour le TPE ${invalidSnRowError.terminal.terminalSN}`,
            });
        }

        if (invalidModelRowError) {
            return res.status(400).json({
                message: `Modèle manquant à la ligne ${invalidModelRowError.rowNumber} pour le TPE ${invalidModelRowError.terminal.terminalSN}`,
            });
        }

        console.log(`Extraction complète par utilisateur ${userId} !`)
        return res.status(201).json({
            message: "Extraction complète",
            data: terminals,
        });
    } catch (error) {
        console.error("Erreur lors de l'extraction du fichier Excel :", error);
        return res.status(500).json({ message: "Erreur interne", error });
    }
}

// Fonction pour faire une demande de mise au rebut
const demandeRebut = async (req, res) => {
    try {
        const {
            commentaire,
            listeRebut,
            quantite,
            userId,
            dateRebut,
            isReg,
        } = req.body

        const files = req.files?.files || [];
        const files_content = files.length ? files.map(file => ({
            name: file.originalname,
            path: file.path,
            type: file.mimetype,
            size: file.size
        }))
            : [];

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId)
            }
        })
        if (!utilisateur) {
            console.error('Utilisteur introuvable !')
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        const details = typeof listeRebut === "string" ? JSON.parse(listeRebut) : listeRebut;

        const reg = isReg == "false" ? false : true
        let dateAction = new Date()
        const dateVer = new Date(dateRebut)
        if (!isNaN(dateVer.valueOf())) {
            dateAction = new Date(dateRebut)
        }

        const nouveauRebut = await prisma.$transaction(async (tx) => {
            const rebutForm = await tx.forms.create({
                data: {
                    type: 'demande_rebut',
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    nom_user: utilisateur.fullname,
                    commentaire,
                    created_by: utilisateur.id_user,
                    is_reg: reg,
                }
            })
            const rebut = await tx.demande_rebut.create({
                data: {
                    form_id: rebutForm.id,
                    statut: 'en_cours',
                    quantite: parseInt(quantite),
                    liste_rebut: JSON.stringify(details),
                }
            })
            if (files_content.length > 0) {
                await tx.fichiers.createMany({
                    data: files_content.map(fichier => ({
                        path: fichier.path,
                        filename: fichier.name,
                        originalName: fichier.name,
                        mimeType: fichier.type,
                        size: fichier.size,
                        uploaded_by: utilisateur.id_user,
                        form_id: rebutForm.id,
                        type_formulaire: 'rebut',
                        role: 'demandeur',
                        created_at: dateAction,
                    }))
                })
            }

            return {
                rebutForm,
                rebut,
            }
        })

        /****************    GESTION DES MAILS     *****************/

        const rolesSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 33,
            },
            include: {
                users: true
            }
        })
        const rolesValidation = await prisma.user_roles.findMany({
            where: {
                role_id: 31,
            },
            include: {
                users: true
            }
        })
        const superviseurs = rolesSupervision.map(us => us.users)
        const validateurs = rolesValidation.map(us => us.users)

        let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/demande-rebut/${nouveauRebut.rebut.id}`;

        let subject = `SYSLIS - MISE AU REBUT`;
        let html = `
                <p>Bonjour,</p>
                <p>Une nouvelle demande de mise au rebut a été soumise.</p>
                <ul>
                <li><strong>Nombre de TPE :</strong> ${quantite}</li>
                </ul>
                <br>
                <p>Commentaire : ${commentaire_mail}<p>
                <br>
                <p>Retrouvez la demande à ce lien : 
                <span>
                <a href="${link}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
                    Cliquez ici !
                </a>
                </span>
                </p>
                <br><br>
                <p>Green - Pay vous remercie.</p>
            `;
        if (reg) {
            subject = `SYSLIS - REGULARISATION MISE AU REBUT`;
            html = `
                <p>Bonjour,</p>
                <p>Une régularisation de mise au rebut a été soumise.</p>
                <ul>
                <li><strong>Nombre de TPE :</strong> ${quantite}</li>
                </ul>
                <br>
                <p>Commentaire : ${commentaire_mail}<p>
                <br>
                <p>Retrouvez la demande à ce lien : 
                <span>
                <a href="${link}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
                    Cliquez ici !
                </a>
                </span>
                </p>
                <br><br>
                <p>Green - Pay vous remercie.</p>
            `;
        }
        if (superviseurs && superviseurs.length > 0) {
            for (const superviseur of superviseurs) {
                await sendMail({
                    to: superviseur.email,
                    subject,
                    html,
                });
            }
        }
        if (validateurs && validateurs.length > 0) {
            for (const validateur of validateurs) {
                await sendMail({
                    to: validateur.email,
                    subject,
                    html,
                });
            }
        }

        console.log(`Demande de mise au rebut enregistrée avec succès par ${utilisateur.username}`)
        res.status(201).json({
            message: `Demande de mise au rebut enregistrée avec succès par ${utilisateur.username}`,
            data: nouveauRebut,
        });
    } catch (error) {
        console.error("Erreur lors de la demande de mise au rebut :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

// Fonction pour avoir la liste de toutes les demandes de mise au rebut et leur statut
const getAllDemandesRebut = async (req, res) => {
    try {
        const demandes = await prisma.demande_rebut.findMany({
            include: {
                forms: true,
                validation_rebut: {
                    include: {
                        forms: true,
                    },
                },
            },
            orderBy: {
                forms: {
                    last_modified_at: 'desc',
                }
            },
        });

        res.status(200).json(demandes);
    } catch (error) {
        console.error("Erreur lors de la récupération des demandes de mise au rebut :", error)
        res.status(500).json({ message: "Erreur lors de la récupération des demandes de mise au rebut", error });
    }
}

// Fonction pour avoir les détails de pièces défectueuses et fonctionnelles sur un TPE au rebut
const getTpeRebutDetails = async (req, res) => {
    try {
        const {
            id,
        } = req.params

        const tpe = await prisma.parc_tpe.findUnique({
            where: {
                id: parseInt(id),
            },
            include: {
                statut_tpe: true,
                model_piece: true,
                pieces_rebut: {
                    include: {
                        items: true,
                    },
                },
                sn_rebut: {
                    include: {
                        history_snapshot_piece_rebut: {
                            include: {
                                history_piece_rebut: true,
                            },
                            orderBy: {
                                created_at: 'desc',
                            },
                        },
                        mouvement_piece_rebut: true,
                    },
                },
            },
        })

        if (tpe.statut_tpe.statut != 'rebut') {
            console.error('Statut du terminal non conforme !')
            return res.status(400).json({ message: "Le terminal n'est pas au rebut !" });
        }

        res.status(200).json(tpe);
    } catch (error) {
        console.error("Erreur lors de la récupération du TPE :", error)
        res.status(500).json({ message: "Erreur lors de la récupération du TPE", error });
    }
}

// Fonction pour la liste des TPE du parc au staut 'rebut' avec leurs pièces
const getAllTpeRebuts = async (req, res) => {
    try {
        const tpe = await prisma.parc_tpe.findMany({
            where: {
                statut_id: 5,
            },
            include: {
                model_piece: true,
                sn_rebut: true,
                pieces_rebut: {
                    include: {
                        items: true,
                    },
                },
            },
            orderBy: {
                last_modified_at: 'desc',
            },
        });

        res.status(200).json(tpe);
    } catch (error) {
        console.error("Erreur lors de la récupération des TPE au rebut :", error)
        res.status(500).json({ message: "Erreur lors de la récupération des TPE au rebut", error });
    }
}

// Fonction pour modifier la liste de pièces fonctionnelles/défectueuses d'un terminal
const changeLotPiece = async (req, res) => {
    try {
        const {
            id
        } = req.params
        const {
            listePieceDef,
            listePieceRec,
            userId,
        } = req.body

        const terminal = await prisma.parc_tpe.findUnique({
            where: {
                id: parseInt(id),
            },
        })

        if (!terminal) {
            console.error('Terminal introuvable !')
            return res.status(404).json({ message: "Terminal introuvable !" });
        }

        if (terminal.is_deleted) {
            console.error('Terminal supprimé !')
            return res.status(400).json({ message: "Terminal supprimé !" });
        }

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId)
            }
        })
        if (!utilisateur) {
            console.error('Utilisteur introuvable !')
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        const piecesFonc = typeof listePieceRec === "string" ? JSON.parse(listePieceRec) : listePieceRec;
        const pieceDef = typeof listePieceDef === "string" ? JSON.parse(listePieceDef) : listePieceDef;

        const duplicates = piecesFonc.filter(id =>
            pieceDef.includes(id)
        );

        if (duplicates.length) {
            console.log("Une pièce ne peut pas être à la fois fonctionnelle et défectueuse.")
            return res.status(400).json({
                message: "Une pièce ne peut pas être à la fois fonctionnelle et défectueuse."
            });
        }

        const dateAction = new Date()

        let rebut_session = await prisma.sn_rebut.findFirst({
            where: {
                sn_id: terminal.id,
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        const data = []
        const historyData = []

        if (Array.isArray(piecesFonc)) {
            data.push(
                ...piecesFonc.map(pieceId => ({
                    sn_id: terminal.id,
                    piece_id: pieceId,
                    etat: 'fonctionnel',
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                }))
            );
            historyData.push(
                ...piecesFonc.map(pieceId => ({
                    piece_id: pieceId,
                    etat: 'fonctionnel',
                }))
            )
        }

        if (Array.isArray(pieceDef)) {
            data.push(
                ...pieceDef.map(pieceId => ({
                    sn_id: terminal.id,
                    piece_id: pieceId,
                    etat: 'defectueux',
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                }))
            );
            historyData.push(
                ...pieceDef.map(pieceId => ({
                    piece_id: pieceId,
                    etat: 'defectueux',
                }))
            )
        }

        const modification = await prisma.$transaction(async (tx) => {

            if (!rebut_session) {
                rebut_session = await tx.sn_rebut.create({
                    data: {
                        sn_id: terminal.id,
                        created_at: dateAction,
                        last_modified_at: dateAction,
                        created_by: utilisateur.id_user,
                    }
                })
            } else {
                await tx.sn_rebut.update({
                    where: {
                        id: rebut_session.id,
                    },
                    data: {
                        last_modified_at: dateAction,
                        updated_at: dateAction,
                        updated_by: utilisateur.id_user,
                    }
                })
            }

            await tx.pieces_rebut.deleteMany({
                where: { sn_id: terminal.id }
            })

            if (data.length) {

                const snapshot = await tx.history_snapshot_piece_rebut.create({
                    data: {
                        rebut_id: rebut_session.id,
                        created_by: utilisateur.id_user,
                        created_at: dateAction,
                    }
                })

                await tx.pieces_rebut.createMany({
                    data,
                });

                await tx.history_piece_rebut.createMany({
                    data: historyData.map(item => ({
                        ...item,
                        snap_id: snapshot.id,
                    })),
                })
            }

            return true
        })

        console.log(`Modification du lot de pièces du TPE ${terminal.id} : ${terminal.serial_number} par ${utilisateur.username}`)
        res.status(200).json({
            data: modification,
            message: `Modification du lot de pièces du TPE ${terminal.id} : ${terminal.serial_number} par ${utilisateur.username}`
        });
    } catch (error) {
        console.error("Erreur lors de la modification de pièces :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

// Fonction pour changer le statut de pièces fonctionnelles d'un TPE en 'utilise'
const recupPieceFonc = async (req, res) => {
    try {
        const {
            id
        } = req.params
        const {
            listePiecesRecup,
            listePiecesFoncReste,
            listePiecesDef,
            userId,
        } = req.body

        const terminal = await prisma.parc_tpe.findUnique({
            where: {
                id: parseInt(id),
            },
        })

        if (!terminal) {
            console.error('Terminal introuvable !')
            return res.status(404).json({ message: "Terminal introuvable !" });
        }

        if (terminal.is_deleted) {
            console.error('Terminal supprimé !')
            return res.status(400).json({ message: "Terminal supprimé !" });
        }

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId)
            }
        })
        if (!utilisateur) {
            console.error('Utilisteur introuvable !')
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        const piecesRecup = typeof listePiecesRecup === "string" ? JSON.parse(listePiecesRecup) : listePiecesRecup;
        const piecesFoncReste = typeof listePiecesFoncReste === "string" ? JSON.parse(listePiecesFoncReste) : listePiecesFoncReste;
        const piecesDef = typeof listePiecesDef === "string" ? JSON.parse(listePiecesDef) : listePiecesDef;

        let rebut_session = await prisma.sn_rebut.findFirst({
            where: {
                sn_id: terminal.id,
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        const dateAction = new Date()

        const dataUpdate = []
        const mouvementData = []
        const historyData = []

        if (Array.isArray(piecesRecup)) {
            // Update de la liste de pièces à récuper: changer de statut de fonctionnel à utilisé
            dataUpdate.push(
                ...piecesRecup.map(pieceId => ({
                    sn_id: terminal.id,
                    piece_id: pieceId,
                    etat: 'utilise',
                    updated_by: utilisateur.id_user,
                    updated_at: dateAction,
                }))
            );
            // Mouvement des pièces fonctionnelles à utilisées
            mouvementData.push(
                ...piecesRecup.map(pieceId => ({
                    piece_id: pieceId,
                    ancien_etat: 'fonctionnel',
                    nouvel_etat: 'utilise',
                    mouvement: 'retrait',
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                }))
            );
        }

        // Historique des pièces utilisé au moment de l'action
        if (Array.isArray(piecesRecup)) {
            historyData.push(
                ...piecesRecup.map(pieceId => ({
                    piece_id: pieceId,
                    etat: 'utilise',
                }))
            )
        }
        // Historique des pièces fonctionnelles (non utilisées) au moment de l'action
        if (Array.isArray(piecesFoncReste)) {
            historyData.push(
                ...piecesFoncReste.map(pieceId => ({
                    piece_id: pieceId,
                    etat: 'fonctionnel',
                }))
            )
        }
        // Historique des pièces défectueuses au moment de l'action
        if (Array.isArray(piecesDef)) {
            historyData.push(
                ...piecesDef.map(pieceId => ({
                    piece_id: pieceId,
                    etat: 'defectueux',
                }))
            )
        }

        const recuperation = await prisma.$transaction(async (tx) => {

            await tx.sn_rebut.update({
                where: {
                    id: rebut_session.id,
                },
                data: {
                    last_modified_at: dateAction,
                    updated_at: dateAction,
                    updated_by: utilisateur.id_user,
                }
            })

            await Promise.all(
                dataUpdate.map(piece =>
                    tx.pieces_rebut.updateMany({
                        where: {
                            sn_id: terminal.id,
                            piece_id: piece.piece_id,
                        },
                        data: {
                            etat: piece.etat,
                            updated_by: piece.updated_by,
                            updated_at: piece.updated_at,
                        }
                    })
                )
            );

            const snapshot = await tx.history_snapshot_piece_rebut.create({
                data: {
                    rebut_id: rebut_session.id,
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                }
            })

            await tx.history_piece_rebut.createMany({
                data: historyData.map(item => ({
                    ...item,
                    snap_id: snapshot.id,
                })),
            })

            await tx.mouvement_piece_rebut.createMany({
                data: mouvementData.map(item => ({
                    ...item,
                    rebut_id: rebut_session.id,
                    snap_id: snapshot.id,
                })),
            })

            return {
                snapshot
            }
        })

        console.log(`Récupération des pièces fonctionnelles du TPE ${terminal.id} : ${terminal.serial_number} par ${utilisateur.username}`)
        res.status(200).json({
            data: recuperation,
            message: `Récupération des pièces fonctionnelles du TPE ${terminal.id} : ${terminal.serial_number} par ${utilisateur.username}`
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des pièces fonctionnelles :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

// Fonction pour récupérér l'historique des états des pièces à chaque mouvement des pièces au cours d'une session rebut
const getTpePieceRebutHistory = async (req, res) => {
    try {
        const {
            id,
        } = req.params

        const history = await prisma.history_snapshot_piece_rebut.findMany({
            where: {
                rebut_id: parseInt(id),
            },
            include: {
                history_piece_rebut: {
                    include: {
                        items: true,
                    },
                },
            },
            select: {
                users: {
                    select: {
                        id_user: true,
                        fullname: true,
                    },
                }
            },
            orderBy: {
                created_at: 'desc',
            },
        })

        res.status(200).json(history);
    } catch (error) {
        console.error("Erreur lors de la récupération de l'historique des pièces rebuts :", error)
        res.status(500).json({ message: "Erreur lors de la récupération de l'historique des pièces rebuts", error });
    } res.status(500).json({ message: "Erreur lors de la récupération de l'historique", error });
}

// Fonction pour récupérer facilement la liste des pièces au rebut (fonctionnelles/defectueuses)
const getAllPiecesRebut = async (req, res) => {
    try {
        const pieces = await prisma.pieces_rebut.findMany({
            include: {
                items: true,
                parc_tpe: true,
            },
            orderBy: {
                items: {
                    nom_piece: 'desc',
                },
            },
        });
        res.status(200).json(pieces);
    } catch (error) {
        console.error("Erreur lors de la récupération des pièces au rebut :", error)
        res.status(500).json({ message: "Erreur lors de la récupération des pièces au rebut", error });
    }
}

// Fonction pour récupérer les données d'une demande de mise au rebut
const getOneDemandeRebut = async (req, res) => {
    try {
        const {
            id,
        } = req.params

        const demande = await prisma.demande_rebut.findUnique({
            where: {
                id: parseInt(id),
            },
            include: {
                forms: {
                    include: {
                        users_forms_created_byTousers: true,
                        users_forms_updated_byTousers: true,
                    },
                },
                validation_rebut: true,
            },
        })

        res.status(200).json(demande);
    } catch (error) {
        console.error("Erreur lors de la récupération d'une demande de mise au rebut :", error)
        res.status(500).json({ message: "Erreur lors de la récupération d'une demande de mise au rebut", error });
    }
}

// Fonction pour modifier la liste d'une mise au rebut en attente de validation
const updateDemandeRebut = async (req, res) => {
    try {
        const {
            id
        } = req.params
        const {
            commentaire,
            listeRebut,
            quantite,
            userId,
            dateRebut,
            isReg,
        } = req.body

        const demandeRebut = await prisma.demande_rebut.findUnique({
            where: {
                id: parseInt(id)
            },
        })

        const rebutForm = await prisma.forms.findUnique({
            where: {
                id: parseInt(demandeRebut.form_id)
            },
        })

        if (!demandeRebut) {
            console.error('Demande de mise au rebut introuvable !')
            return res.status(404).json({ message: "Demande de mise au rebut introuvable !" });
        }
        if (demandeRebut.statut != 'en_cours' && demandeRebut.statut != 'retourne') {
            console.error('Statut de la demande de mise au rebut invalide !')
            return res.status(400).json({ message: "Statut de la demande de mise au rebut invalide !" });
        }
        if (rebutForm.is_deleted) {
            console.error('Demande de mise au rebut déjà supprimée !')
            return res.status(400).json({ message: "Demande de mise au rebut déjà supprimée !" });
        }

        const files = req.files?.files || [];
        const files_content = files.length ? files.map(file => ({
            name: file.originalname,
            path: file.path,
            type: file.mimetype,
            size: file.size
        }))
            : [];

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId)
            }
        })
        if (!utilisateur) {
            console.error('Utilisteur introuvable !')
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        const details = typeof listeRebut === "string" ? JSON.parse(listeRebut) : listeRebut;

        const reg = isReg == "false" ? false : true
        let dateAction = new Date()
        const dateVer = new Date(dateRebut)
        if (!isNaN(dateVer.valueOf())) {
            dateAction = new Date(dateRebut)
        }

        const updateRebut = await prisma.$transaction(async (tx) => {
            const updatedRebutForm = await tx.forms.update({
                where: {
                    id: rebutForm.id,
                },
                data: {
                    last_modified_at: dateAction,
                    updated_at: dateAction,
                    nom_user: utilisateur.fullname,
                    commentaire,
                    updated_by: utilisateur.id_user,
                    is_reg: reg,
                }
            })
            const rebut = await tx.demande_rebut.update({
                where: {
                    id: demandeRebut.id,
                },
                data: {
                    statut: 'en_cours',
                    quantite: parseInt(quantite),
                    liste_rebut: JSON.stringify(details),
                }
            })
            if (files_content.length > 0) {
                await tx.fichiers.createMany({
                    data: files_content.map(fichier => ({
                        path: fichier.path,
                        filename: fichier.name,
                        originalName: fichier.name,
                        mimeType: fichier.type,
                        size: fichier.size,
                        uploaded_by: utilisateur.id_user,
                        form_id: updatedRebutForm.id,
                        type_formulaire: 'rebut',
                        role: 'demandeur',
                        created_at: dateAction,
                    }))
                })
            }

            return {
                updatedRebutForm,
                rebut,
            }
        })

        /****************    GESTION DES MAILS     *****************/

        const rolesSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 33,
            },
            include: {
                users: true
            }
        })
        const rolesValidation = await prisma.user_roles.findMany({
            where: {
                role_id: 31,
            },
            include: {
                users: true
            }
        })
        const superviseurs = rolesSupervision.map(us => us.users)
        const validateurs = rolesValidation.map(us => us.users)

        let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/demande-rebut/${updateRebut.rebut.id}`;

        let subject = `SYSLIS - MODIFICATION DE MISE AU REBUT`;
        let html = `
                <p>Bonjour,</p>
                <p>La demande de mise au rebut #${id} a été modifiée.</p>
                <ul>
                <li><strong>Nombre de TPE :</strong> ${quantite}</li>
                </ul>
                <br>
                <p>Commentaire : ${commentaire_mail}<p>
                <br>
                <p>Retrouvez la demande à ce lien : 
                <span>
                <a href="${link}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
                    Cliquez ici !
                </a>
                </span>
                </p>
                <br><br>
                <p>Green - Pay vous remercie.</p>
            `;
        if (superviseurs && superviseurs.length > 0) {
            for (const superviseur of superviseurs) {
                await sendMail({
                    to: superviseur.email,
                    subject,
                    html,
                });
            }
        }
        if (validateurs && validateurs.length > 0) {
            for (const validateur of validateurs) {
                await sendMail({
                    to: validateur.email,
                    subject,
                    html,
                });
            }
        }

        console.log(`Demande de mise au rebut ${id} modifiée avec succès par ${utilisateur.username}`)
        res.status(201).json({
            message: `Demande de mise au rebut ${id} modifiée avec succès par ${utilisateur.username}`,
            data: updateRebut,
        });
    } catch (error) {
        console.error("Erreur lors de la modification de la demande de mise au rebut :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

// Fonction pour valider une liste de mise au rebut
const validateDemandeRebut = async (req, res) => {
    try {
        const {
            id
        } = req.params
        const {
            commentaire,
            listeRebut,
            quantite,
            userId,
            dateRebut,
            isReg,
        } = req.body

        const demandeRebut = await prisma.demande_rebut.findUnique({
            where: {
                id: parseInt(id)
            },
        })

        const rebutForm = await prisma.forms.findUnique({
            where: {
                id: parseInt(demandeRebut.form_id)
            },
        })

        if (!demandeRebut) {
            console.error('Demande de mise au rebut introuvable !')
            return res.status(404).json({ message: "Demande de mise au rebut introuvable !" });
        }
        if (demandeRebut.statut == 'valide') {
            console.error('Demande de mise au rebut déjà validée !')
            return res.status(400).json({ message: "Demande de mise au rebut déjà validée !" });
        }
        if (demandeRebut.statut != 'en_cours') {
            console.error('Statut de la demande de mise au rebut invalide !')
            return res.status(400).json({ message: "Statut de la demande de mise au rebut invalide !" });
        }
        if (rebutForm.is_deleted) {
            console.error('Demande de mise au rebut déjà supprimée !')
            return res.status(400).json({ message: "Demande de mise au rebut déjà supprimée !" });
        }

        const files = req.files?.files || [];
        const files_content = files.length ? files.map(file => ({
            name: file.originalname,
            path: file.path,
            type: file.mimetype,
            size: file.size
        }))
            : [];

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId)
            }
        })
        if (!utilisateur) {
            console.error('Utilisteur introuvable !')
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        const details = typeof listeRebut === "string" ? JSON.parse(listeRebut) : listeRebut;

        // const data = []
        // const historyData = []

        // details.forEach((terminal) => {
        //     const piecesFonc = terminal.pieces_recuperees
        //     const piecesDef = terminal.pieces_defectueuses

        //     const duplicates = piecesFonc.filter(id =>
        //         pieceDef.includes(id)
        //     );

        //     if (duplicates.length) {
        //         console.log(`Le terminal ${terminal.terminalSN} présentes des pièces à la fois fonctionnelles et défectueuses.`)
        //         return res.status(400).json({
        //             message: `Le terminal ${terminal.terminalSN} présentes des pièces à la fois fonctionnelles et défectueuses.`
        //         });
        //     }

        //     if (Array.isArray(piecesFonc)) {
        //         data.push(
        //             ...piecesFonc.map(pieceId => ({
        //                 piece_id: pieceId,
        //                 etat: 'fonctionnel',
        //                 created_by: utilisateur.id_user,
        //                 created_at: dateAction,
        //             }))
        //         );
        //         historyData.push(
        //             ...piecesFonc.map(pieceId => ({
        //                 piece_id: pieceId,
        //                 etat: 'fonctionnel',
        //             }))
        //         )
        //     }

        //     if (Array.isArray(pieceDef)) {
        //         data.push(
        //             ...pieceDef.map(pieceId => ({
        //                 piece_id: pieceId,
        //                 etat: 'defectueux',
        //                 created_by: utilisateur.id_user,
        //                 created_at: dateAction,
        //             }))
        //         );
        //         historyData.push(
        //             ...pieceDef.map(pieceId => ({
        //                 piece_id: pieceId,
        //                 etat: 'defectueux',
        //             }))
        //         )
        //     }
        // })

        const reg = isReg == "false" ? false : true
        let dateAction = new Date()
        const dateVer = new Date(dateRebut)
        if (!isNaN(dateVer.valueOf())) {
            dateAction = new Date(dateRebut)
        }

        const validationRebut = await prisma.$transaction(async (tx) => {
            const validationForm = await tx.forms.create({
                data: {
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    created_by: utilisateur.id_user,
                    nom_user: utilisateur.fullname,
                    commentaire,
                    is_reg: isReg,
                    type: 'validation_rebut',
                }
            })
            const validation = await tx.validation_rebut.create({
                data: {
                    demande_id: demandeRebut.id,
                    form_id: validationForm.id,
                    type: 'validation',
                    quantite,
                    liste_rebut: JSON.stringify(details),
                }
            })

            const rebut = await tx.demande_rebut.update({
                where: {
                    id: demandeRebut.id,
                },
                data: {
                    statut: 'valide',
                    liste_rebut: JSON.stringify(details),
                }
            })

            if (files_content.length > 0) {
                await tx.fichiers.createMany({
                    data: files_content.map(fichier => ({
                        path: fichier.path,
                        filename: fichier.name,
                        originalName: fichier.name,
                        mimeType: fichier.type,
                        size: fichier.size,
                        uploaded_by: utilisateur.id_user,
                        form_id: validationForm.id,
                        type_formulaire: 'rebut',
                        role: 'validateur',
                        created_at: dateAction,
                    }))
                })
            }

            return {
                validationForm,
                validation,
                rebut,
            }
        })

        /****************    GESTION DES MAILS     *****************/

        const rolesSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 33,
            },
            include: {
                users: true
            }
        })
        const rolesDemandeur = await prisma.user_roles.findMany({
            where: {
                role_id: 30,
            },
            include: {
                users: true
            }
        })
        const superviseurs = rolesSupervision.map(us => us.users)
        const demandeurs = rolesDemandeur.map(us => us.users)

        let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/demande-rebut/${validationRebut.rebut.id}`;

        let subject = `SYSLIS - VALIDATION DE MISE AU REBUT`;
        let html = `
                <p>Bonjour,</p>
                <p>La demande de mise au rebut #${id} a été validée.</p>
                <ul>
                <li><strong>Nombre de TPE :</strong> ${quantite}</li>
                </ul>
                <br>
                <p>Commentaire : ${commentaire_mail}<p>
                <br>
                <p>Retrouvez la demande à ce lien : 
                <span>
                <a href="${link}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
                    Cliquez ici !
                </a>
                </span>
                </p>
                <br><br>
                <p>Green - Pay vous remercie.</p>
            `;
        if (superviseurs && superviseurs.length > 0) {
            for (const superviseur of superviseurs) {
                await sendMail({
                    to: superviseur.email,
                    subject,
                    html,
                });
            }
        }
        if (demandeurs && demandeurs.length > 0) {
            for (const demandeur of demandeurs) {
                await sendMail({
                    to: demandeur.email,
                    subject,
                    html,
                });
            }
        }

        console.log(`Demande de mise au rebut ${id} modifiée avec succès par ${utilisateur.username}`)
        res.status(201).json({
            message: `Demande de mise au rebut ${id} modifiée avec succès par ${utilisateur.username}`,
            data: validationRebut,
        });
    } catch (error) {
        console.error("Erreur lors de la modification de la demande de mise au rebut :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

module.exports = {
    downloadTemplateRebut,
    extractRebut,
    demandeRebut,
    getAllDemandesRebut,
    getAllTpeRebuts,
    getTpeRebutDetails,
    changeLotPiece,
    recupPieceFonc,
    getAllPiecesRebut,
    getOneDemandeRebut,
    updateDemandeRebut,
    validateDemandeRebut,
}