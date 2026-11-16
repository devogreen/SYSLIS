const securiserUpload = require("./securiserUpload");
const multer = require('multer');
const path = require('path');
const { IMAGES, ErreurUpload, estAutorise, nomAleatoire } = require('./filtresUpload');

const TEST_ENV = require("../utils/consts")

const localUrl = "uploads"
const serverUrl =  "../syslisUploads"
let baseUrl = serverUrl
if (TEST_ENV) {
  baseUrl = localUrl
}

// Config de stockage (ici stockage temporaire)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, `${baseUrl}/`); // Dossier temporaire
  },
  filename: nomAleatoire
});

// Images uniquement (signatures) : PNG, JPG ou WEBP, extension et type MIME vérifiés
const fileFilter = (req, file, cb) => {
  if (estAutorise(file, IMAGES)) {
    cb(null, true);
  } else {
    cb(new ErreurUpload('Fichier non supporté. Merci de fournir une image PNG, JPG ou WEBP.'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024, files: 5 } });

module.exports = securiserUpload(upload);
