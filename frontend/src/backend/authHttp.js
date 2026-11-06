// backend/authHttp.js
// Ajoute le token de connexion (localStorage 'token') à tous les appels de l'API, via axios ou fetch,
// et renvoie vers la page de connexion quand l'API répond 401 (session absente ou expirée).
// Importé une seule fois dans main.tsx.
import axios from "axios";
import urlBase from "./const";

const lireToken = () => {
    try {
        return localStorage.getItem("token");
    } catch (e) {
        return null;
    }
};

const urlDeLApi = (url) => {
    if (!url) return false;
    const texte = String(url);
    return texte.startsWith(urlBase) || texte.startsWith("/api/");
};

const estLogin = (url) => String(url || "").includes("/api/auth/login");

let redirectionEnCours = false;
const renvoyerVersConnexion = () => {
    if (redirectionEnCours || window.location.pathname === "/signin") return;
    redirectionEnCours = true;
    try {
        ["token", "id", "email", "username"].forEach((cle) => localStorage.removeItem(cle));
    } catch (e) {
        // stockage indisponible : la redirection suffit
    }
    window.location.assign("/signin");
};

// axios
axios.interceptors.request.use((config) => {
    const token = lireToken();
    if (token && urlDeLApi(config.url)) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
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
    const token = lireToken();
    let options = init;
    if (token && urlDeLApi(url)) {
        const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
        if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
        options = { ...init, headers };
    }
    return fetchOrigine(input, options).then((response) => {
        if (response.status === 401 && urlDeLApi(url) && !estLogin(url)) {
            renvoyerVersConnexion();
        }
        return response;
    });
};
