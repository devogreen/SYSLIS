// Mode test (local) : lu dans le .env, plus jamais écrit en dur dans le code.
//   .env local      : TEST_ENVIRONMENT=true   (liens des mails vers localhost:5173, uploads dans backend/uploads, cookie non "Secure")
//   .env production : TEST_ENVIRONMENT=false  (ou absent)
// dotenv est chargé ici car ce fichier est requis avant le dotenv.config() d'app.js.
require("dotenv").config();

const TEST_ENV = String(process.env.TEST_ENVIRONMENT || "").trim().toLowerCase() === "true"

module.exports = TEST_ENV
