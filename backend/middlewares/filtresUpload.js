// middlewares/filtresUpload.js
// Types de fichiers acceptés à l'upload : l'extension ET le type MIME doivent correspondre à la liste.
// (Le type MIME est déclaré par le navigateur, l'extension par le nom du fichier : on exige les deux.)
const path = require("path");

const IMAGES = {
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".webp": ["image/webp"],
};

const DOCUMENTS = {
  ...IMAGES,
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".csv": ["text/csv", "application/vnd.ms-excel"],
  // Les navigateurs envoient souvent les mails Outlook / .eml en application/octet-stream
  ".msg": ["application/vnd.ms-outlook", "application/octet-stream"],
  ".eml": ["message/rfc822", "application/octet-stream"],
};

const EXCEL = {
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
};

// Erreur renvoyée en 400 par le gestionnaire d'erreurs d'app.js
class ErreurUpload extends Error {
  constructor(message) {
    super(message);
    this.name = "ErreurUpload";
    this.status = 400;
  }
}

const extensionDe = (file) => path.extname(String(file.originalname || "")).toLowerCase();

const estAutorise = (file, types) => {
  const ext = extensionDe(file);
  return Object.prototype.hasOwnProperty.call(types, ext) && types[ext].includes(file.mimetype);
};

// reglesParChamp : { nomDuChamp: { types, message } }. Les champs non listés sont ignorés (fichier non enregistré).
const filtrerParChamp = (reglesParChamp) => (req, file, cb) => {
  const regle = reglesParChamp[file.fieldname];
  if (!regle) return cb(null, false);
  if (!estAutorise(file, regle.types)) return cb(new ErreurUpload(regle.message));
  return cb(null, true);
};

// Nom de fichier enregistré sur le disque : aléatoire + extension autorisée (jamais le nom d'origine)
const nomAleatoire = (req, file, cb) => {
  cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extensionDe(file)}`);
};

module.exports = { IMAGES, DOCUMENTS, EXCEL, ErreurUpload, estAutorise, filtrerParChamp, nomAleatoire, extensionDe };
