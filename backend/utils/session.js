// utils/session.js
// Session de connexion : le JWT est stocké dans un cookie HttpOnly (illisible par le JavaScript de la page,
// donc non volable par une faille XSS ou une dépendance npm compromise).
const TEST_ENV = require("./consts");

const NOM_COOKIE_SESSION = "syslis_session";
const DUREE_SESSION_MS = 2 * 60 * 60 * 1000; // identique à l'expiration du JWT (2 h)

const optionsCookie = () => ({
    httpOnly: true,
    // HTTPS obligatoire en production ; en local (http://localhost) le cookie doit pouvoir passer en clair
    secure: !TEST_ENV,
    // Le cookie n'est jamais envoyé par un autre site (protection CSRF de base)
    sameSite: "strict",
    path: "/",
});

const poserCookieSession = (res, token) => {
    res.cookie(NOM_COOKIE_SESSION, token, { ...optionsCookie(), maxAge: DUREE_SESSION_MS });
};

const effacerCookieSession = (res) => {
    res.clearCookie(NOM_COOKIE_SESSION, optionsCookie());
};

// Lecture d'un cookie sans dépendance supplémentaire
const lireCookie = (req, nom) => {
    const entete = String(req.headers.cookie || "");
    for (const morceau of entete.split(";")) {
        const i = morceau.indexOf("=");
        if (i === -1) continue;
        if (morceau.slice(0, i).trim() === nom) {
            try {
                return decodeURIComponent(morceau.slice(i + 1).trim());
            } catch (e) {
                return null;
            }
        }
    }
    return null;
};

const lireTokenSession = (req) => lireCookie(req, NOM_COOKIE_SESSION);

module.exports = { NOM_COOKIE_SESSION, DUREE_SESSION_MS, poserCookieSession, effacerCookieSession, lireTokenSession };
