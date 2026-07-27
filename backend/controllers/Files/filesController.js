const TEST_ENV = require("../../utils/consts")

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const prisma = require('../../prisma/client');
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

const getAllFormFiles = async (req, res) => {
    const {
        id
    } = req.params

    try {

        const formId = parseInt(id, 10);

        if (isNaN(formId)) {
            return res.status(400).json({ message: "Invalid demande ID" });
        }
        const form = await prisma.forms.findUnique({
            where: { id: parseInt(formId) }
        })
        if (!form) {
            console.log('Formulaire introuvable')
            return res.status(404).json({ message: "Formulaire introuvable" });
        }
        const files = await prisma.fichiers.findMany({
            where: {
                form_id: formId,
            },
            orderBy: {
                created_at: "asc"
            },
        });

        console.log('Succès !')
        res.status(200).json(files);
    } catch (error) {
        console.log("Erreur serveur: ", error)
        console.error("Erreur :", error)
        res.status(500).json({ message: "Erreur lors de la récupération des fichiers", error });
    }
}

const downloadFile = async (req, res) => {
  const { id } = req.params;

  const fileId = parseInt(id, 10);

  if (isNaN(fileId)) {
    console.log("Invalid file ID")
    return res.status(400).json({ message: "Invalid file ID" });
  }

  try {
    const file = await prisma.fichiers.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      console.log("File not found")
      return res.status(404).json({ message: "File not found" });
    }

    const filePath = path.resolve(file.path);

    if (!fs.existsSync(filePath)) {
      console.log("File missing on server")
      return res.status(404).json({ message: "File missing on server" });
    }

    console.log('File downloaded !')
    return res.download(filePath, file.filename);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
    getAllFormFiles,
    downloadFile,
}