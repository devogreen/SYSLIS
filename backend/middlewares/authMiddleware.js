// middlewares/authMiddleware.js
// Authentification des routes par le JWT délivré au login (payload : { id_user }).
const jwt = require('jsonwebtoken');

// Vérifie le header "Authorization: Bearer <token>" et place l'utilisateur connecté dans req.user.
// 401 si le token est absent, invalide ou expiré : le front renvoie alors vers la page de connexion.
const authentifier = (req, res, next) => {
    const [type, token] = String(req.headers.authorization || '').split(' ');
    if (type !== 'Bearer' || !token) {
        return res.status(401).json({ message: "Vous devez être connecté." });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const idUser = Number(decoded.id_user);
        if (!Number.isInteger(idUser)) {
            return res.status(401).json({ message: "Session invalide, reconnectez-vous." });
        }
        req.user = { id_user: idUser };
        return next();
    } catch (error) {
        return res.status(401).json({ message: "Session expirée, reconnectez-vous." });
    }
};

// Les contrôleurs lisent l'utilisateur dans la requête (user_id / userId) : il doit être celui du token.
// À placer APRÈS multer sur les routes multipart (le body n'est rempli qu'après l'upload).
const CHAMPS_UTILISATEUR = ['user_id', 'userId'];
const verifierUtilisateur = (req, res, next) => {
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

module.exports = { authentifier, verifierUtilisateur };
