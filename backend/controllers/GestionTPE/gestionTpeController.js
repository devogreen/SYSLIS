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


module.exports = {
    getParcTpe,
    getAllStatut,
    getTpeHistory,
}