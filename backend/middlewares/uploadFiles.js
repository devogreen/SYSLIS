const securiserUpload = require("./securiserUpload");
const multer = require("multer");
const path = require("path");
const { DOCUMENTS, ErreurUpload, estAutorise, nomAleatoire } = require("./filtresUpload");

const TEST_ENV = require("../utils/consts")

const localUrl = "uploads"
const serverUrl =  "../syslisUploads"
let baseUrl = serverUrl
if (TEST_ENV) {
  baseUrl = localUrl
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, `${baseUrl}/uploadsFiles/`);
  },
  filename: nomAleatoire
});

const uploadFiles = multer({
  storage,
  fileFilter: (req, file, cb) => estAutorise(file, DOCUMENTS)
    ? cb(null, true)
    : cb(new ErreurUpload("Type de fichier non autorisé.")),
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = securiserUpload(uploadFiles);
