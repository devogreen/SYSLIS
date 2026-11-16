// backend/authHttp.js
// La session est un cookie HttpOnly posé par l'API au login : le JavaScript de la page ne voit jamais le token.
// Ce module, importé une seule fois dans main.tsx :
// - envoie le cookie avec tous les appels de l'API (axios et fetch), y compris en dev (front et API sur deux ports) ;
// - ajoute l'en-tête X-Requested-With exigé par l'API sur les requêtes qui modifient des données (protection CSRF) ;
// - renvoie vers la page de connexion quand l'API répond 401 (session absente ou expirée).
import axios from "axios";
import urlBase from "./const";

// Ancien stockage du token (avant le cookie HttpOnly) : supprimé s'il existe encore
try {
    localStorage.removeItem("token");
} catch (e) {
    // stockage indisponible
}

const urlDeLApi = (url) => {
    if (!url) return false;
    const texte = String(url);
    return texte.startsWith(urlBase) || texte.startsWith("/api/");
};

const estLogin = (url) => String(url || "").includes("/api/auth/login");

// Identité affichée par l'interface (pas un secret : l'API vérifie tout à partir du cookie)
export const CLES_IDENTITE = ["id", "email", "username"];
export const effacerIdentiteLocale = () => {
    try {
        [...CLES_IDENTITE, "token"].forEach((cle) => localStorage.removeItem(cle));
    } catch (e) {
        // stockage indisponible
    }
};

let redirectionEnCours = false;
const renvoyerVersConnexion = () => {
    // Pas de redirection depuis les pages publiques (connexion, mot de passe oublié, lien reçu par mail)
    const chemin = window.location.pathname;
    const pagePublique = chemin === "/signin" || chemin === "/mot-de-passe-oublie" || chemin.startsWith("/password/");
    if (redirectionEnCours || pagePublique) return;
    redirectionEnCours = true;
    effacerIdentiteLocale();
    window.location.assign("/signin");
};

// axios
axios.interceptors.request.use((config) => {
    if (urlDeLApi(config.url)) {
        config.withCredentials = true;
        config.headers = config.headers || {};
        config.headers["X-Requested-With"] = "XMLHttpRequest";
    }
    return config;
});

axios.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error?.config?.url;
        if (error?.response?.status === 401 && urlDeLApi(url) && !estLogin(url)) {
            renvoyerVersConnexion();
        }
        return Promise.reject(error);
    }
);

// fetch (utilisé par certains tableaux de bord)
const fetchOrigine = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url;
    let options = init;
    if (urlDeLApi(url)) {
        const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
        headers.set("X-Requested-With", "XMLHttpRequest");
        options = { ...init, headers, credentials: "include" };
    }
    return fetchOrigine(input, options).then((response) => {
        if (response.status === 401 && urlDeLApi(url) && !estLogin(url)) {
            renvoyerVersConnexion();
        }
        return response;
    });
};
