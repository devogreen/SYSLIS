// middlewares/authMiddleware.js
// Authentification des routes par le JWT délivré au login (payload : { id_user }).
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');
const { lireTokenSession } = require('../utils/session');

// Rôles d'administration
const ROLE_GESTION_PROFILS = 5;
const ROLE_SUPER_ADMIN = 39;

// Lit le token dans le cookie HttpOnly de session (posé au login), vérifie que le compte existe toujours, n'est pas supprimé
// et que la session n'a pas été fermée (users.token_version),
// puis place l'utilisateur connecté dans req.user = { id_user, roles: [role_id, ...] }.
// 401 si le token est absent, invalide, expiré ou si le compte n'est plus actif : le front renvoie alors vers la connexion.
// Idempotent : peut être monté globalement (app.js) et à nouveau sur un routeur sans refaire la vérification.
const authentifier = async (req, res, next) => {
    if (req.user && Number.isInteger(req.user.id_user)) return next();

    // Le token n'est plus lu dans l'en-tête Authorization : il n'est jamais accessible au JavaScript du navigateur
    const token = lireTokenSession(req);
    if (!token) {
        return res.status(401).json({ message: "Vous devez être connecté." });
    }

    let idUser;
    let versionToken;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        idUser = Number(decoded.id_user);
        // Tokens émis avant l'ajout de la version de session : version 0
        versionToken = decoded.tv === undefined ? 0 : Number(decoded.tv);
    } catch (error) {
        return res.status(401).json({ message: "Session expirée, reconnectez-vous." });
    }
    if (!Number.isInteger(idUser) || idUser <= 0) {
        return res.status(401).json({ message: "Session invalide, reconnectez-vous." });
    }

    try {
        const utilisateur = await prisma.users.findUnique({
            where: { id_user: idUser },
            select: { id_user: true, is_deleted: true, token_version: true, user_roles: { select: { role_id: true } } },
        });
        if (!utilisateur || utilisateur.is_deleted) {
            return res.status(401).json({ message: "Compte inexistant ou désactivé." });
        }
        // Session fermée (déconnexion, changement de mot de passe ou de droits) : le token n'est plus accepté
        if (versionToken !== utilisateur.token_version) {
            return res.status(401).json({ message: "Session expirée, reconnectez-vous." });
        }
        req.user = {
            id_user: utilisateur.id_user,
            roles: utilisateur.user_roles.map((r) => r.role_id),
        };
        return next();
    } catch (error) {
        console.error("Erreur lors de la vérification de la session :", error);
        return res.status(500).json({ message: "Erreur serveur." });
    }
};

// Les contrôleurs lisent l'utilisateur dans la requête (user_id / userId) : il doit être celui du token.
// À placer APRÈS multer sur les routes multipart (le body n'est rempli qu'après l'upload) :
// les middlewares d'upload (middlewares/upload*.js) l'ajoutent automatiquement.
const CHAMPS_UTILISATEUR = ['user_id', 'userId'];
const verifierUtilisateur = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Vous devez être connecté." });
    }
    for (const source of [req.body, req.params, req.query]) {
        if (!source) continue;
        for (const champ of CHAMPS_UTILISATEUR) {
            const valeur = source[champ];
            if (valeur === undefined || valeur === null || valeur === '') continue;
            if (Number(valeur) !== req.user.id_user) {
                return res.status(403).json({ message: "L'utilisateur de la requête ne correspond pas à l'utilisateur connecté." });
            }
        }
    }
    return next();
};

const aUnRole = (req, roleIds) => Array.isArray(req.user?.roles) && req.user.roles.some((r) => roleIds.includes(r));

// Réserve une route aux utilisateurs ayant au moins un des rôles donnés (à placer après authentifier).
const exigerRole = (...roleIds) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Vous devez être connecté." });
    }
    if (!aUnRole(req, roleIds)) {
        return res.status(403).json({ message: "Vous n'avez pas les droits pour cette action." });
    }
    return next();
};

module.exports = {
    authentifier,
    verifierUtilisateur,
    exigerRole,
    aUnRole,
    ROLE_GESTION_PROFILS,
    ROLE_SUPER_ADMIN,
};
