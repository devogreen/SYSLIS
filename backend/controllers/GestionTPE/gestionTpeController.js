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
                forms: true,
                stocks: true,
                statut_tpe: true,
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
        const dateAction = new Date()

        const modification = await prisma.$transaction(async (tx) => {
            const tpe = await tx.parc_tpe.upsert({
                where: {
                    serial_number: terminalSn,
                },
                update: {
                    updated_at: dateAction,
                    updated_by: utilisateur.id_user,
                    last_modified_at: dateAction,
                    statut_id: parseInt(statutId),
                },
                create: {
                    serial_number: terminalSn,
                    created_at: dateAction,
                    created_by: utilisateur.id_user,
                    last_modified_at: dateAction,
                    statut_id: parseInt(statutId),
                }
            })

            await tx.history_tpe.create({
                data: {
                    id_tpe: tpe.id,
                    created_at: dateAction,
                    created_by: utilisateur.id_user,
                    statut_id: parseInt(statutId),
                }
            })

            return {
                tpe,
            }
        })

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

// Fonction d'extraction de fichier excel pour régularisation des demandes QR CODES.
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
        await workbook.xlsx.load(file.buffer);
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

        const serials = new Set();
        let duplicateError = null;
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const sn = normalize(row.getCell(headers[requireHeader]).value);
            if (!sn) return;

            if (serials.has(sn)) {
                duplicateError = {
                    rowNumber,
                    sn,
                };
                return;
            }
            serials.add(sn);

            // console.log("Données extraites ligne", rowNumber, marchand);
        })

        if (duplicateError) {
            return res.status(400).json({
                message: `Doublon trouvé à la ligne ${duplicateError.rowNumber} pour le SN ${duplicateError.sn}`,
            });
        }

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


module.exports = {
    getParcTpe,
    getAllStatut,
    getTpeHistory,
    getTpeInfos,
    changeTpeStatut,
}