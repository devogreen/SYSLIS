// middlewares/origine.js
// Origines (sites) autorisées à appeler l'API avec le cookie de session, et protection CSRF.
const TEST_ENV = require("../utils/consts");

// FRONTEND_ORIGINS (.env) : liste séparée par des virgules, ex. "https://livraisons.greenpayci.com"
const originesAutorisees = () => {
    const depuisEnv = String(process.env.FRONTEND_ORIGINS || "")
        .split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean);
    const parDefaut = [String(process.env.FRONTEND_BASE_URL || "https://livraisons.greenpayci.com").replace(/\/+$/, "")];
    const local = TEST_ENV ? ["http://localhost:5173", "http://127.0.0.1:5173"] : [];
    return [...new Set([...depuisEnv, ...parDefaut, ...local])];
};
const ORIGINES = originesAutorisees();
const estAutorisee = (origine) => ORIGINES.includes(origine);

// Requête venant de la même origine que l'API (front et API servis par le même nginx)
const memeOrigine = (req, origine) => {
    try {
        return new URL(origine).host === req.headers.host;
    } catch (e) {
        return false;
    }
};

// CORS : seules les origines autorisées reçoivent les en-têtes, avec le cookie (credentials)
const optionsCors = {
    origin: (origine, cb) => cb(null, !origine || estAutorisee(origine)),
    credentials: true,
};

// CSRF : le cookie est SameSite=Strict ; en plus, toute requête qui modifie des données doit
// 1) venir d'une origine autorisée (en-tête Origin, envoyé par les navigateurs) et
// 2) porter l'en-tête X-Requested-With, qu'un formulaire ou une image d'un autre site ne peut pas ajouter.
const METHODES_SURES = ["GET", "HEAD", "OPTIONS"];
const protegerCsrf = (req, res, next) => {
    if (METHODES_SURES.includes(req.method)) return next();
    const origine = req.headers.origin;
    if (origine && !estAutorisee(origine) && !memeOrigine(req, origine)) {
        return res.status(403).json({ message: "Origine de la requête non autorisée." });
    }
    if (req.headers["x-requested-with"] !== "XMLHttpRequest") {
        return res.status(403).json({ message: "Requête refusée." });
    }
    return next();
};

module.exports = { optionsCors, protegerCsrf, ORIGINES };
