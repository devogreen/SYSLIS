const securiserUpload = require("./securiserUpload");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { EXCEL, ErreurUpload, estAutorise, nomAleatoire } = require('./filtresUpload');

const uploadExcel = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },
    // Nom aléatoire : le nom d'origine n'est jamais utilisé sur le disque
    filename: nomAleatoire
  }),
  fileFilter: (req, file, cb) => {
    if (!estAutorise(file, EXCEL)) {
      return cb(new ErreurUpload("Seuls les fichiers Excel (.xlsx, .xls) sont acceptés."));
    }
    cb(null, true);
  },
  // Le plus gros modèle actuel fait ~9 Mo
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
});

// Les fichiers Excel importés ne servent qu'à lire les données de la requête :
// ils sont supprimés du disque une fois la réponse envoyée (ils s'accumulaient dans backend/uploads).
const supprimerApresReponse = (req, res, next) => {
  res.on("close", () => {
    const fichiers = [req.file, ...(Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat())].filter(Boolean);
    for (const f of fichiers) {
      if (f.path) fs.unlink(f.path, () => {});
    }
  });
  next();
};

// verifierUtilisateur est ajouté après multer (voir securiserUpload.js)
const securise = securiserUpload(uploadExcel);
module.exports = {
  single: (...args) => [supprimerApresReponse, ...securise.single(...args)],
  array: (...args) => [supprimerApresReponse, ...securise.array(...args)],
  fields: (...args) => [supprimerApresReponse, ...securise.fields(...args)],
};
