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
        let invalidRowError = null;
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const pointMarchand = String(getCellValue(row.getCell(headers["POINT MARCHAND"])) || "").trim();
            const terminalSN = String(getCellValue(row.getCell(headers["S/N"])) || "").trim();
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
                invalidRowError = {
                    rowNumber,
                    terminal: { terminalSN }
                };
                return;
            }

            const terminal = {
                pointMarchand: pointMarchand ? pointMarchand : 'N/A',
                terminalSN,
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

        if (invalidRowError) {
            return res.status(400).json({
                message: `S/N invalide à la ligne ${invalidRowError.rowNumber} pour le TPE ${invalidRowError.terminal.terminalSN}`,
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

module.exports = {
    downloadTemplateRebut,
    extractRebut,
}