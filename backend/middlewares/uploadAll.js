const securiserUpload = require("./securiserUpload");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { IMAGES, DOCUMENTS, filtrerParChamp, nomAleatoire } = require("./filtresUpload");
const TEST_ENV = require("../utils/consts")

const localUrl = "uploads"
const serverUrl =  "../syslisUploads"
let baseUrl = serverUrl
if (TEST_ENV) {
  baseUrl = localUrl
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir = `${baseUrl}/files/`;

    if (file.fieldname === "signature") {
      dir = `${baseUrl}/signatures/`;
    }

    if(file.fieldname === "qrCodes") {
      dir = `${baseUrl}/qrCodes/`
    }

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },

  filename: nomAleatoire
});

const MESSAGE_DOCUMENTS = "Type de fichier non autorisé (PDF, Word, Excel, CSV, image PNG/JPG/WEBP, mail .eml/.msg)."
const uploadAll = multer({
  storage,
  // Le filtre s'appelle obligatoirement "fileFilter" pour que multer l'applique
  fileFilter: filtrerParChamp({
    signature: { types: IMAGES, message: "La signature doit être une image PNG, JPG ou WEBP." },
    files: { types: DOCUMENTS, message: MESSAGE_DOCUMENTS },
    qrCodes: { types: DOCUMENTS, message: MESSAGE_DOCUMENTS },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

module.exports = securiserUpload(uploadAll);
