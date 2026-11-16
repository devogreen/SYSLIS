const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { PrismaClient } = require('@prisma/client');

// Routes

const authRoutes = require("./routes/usersRoutes")
const deliveryRoutes = require("./routes/deliveryRoutes")
const receiveRoutes = require("./routes/receiveRoutes")
const transactionsRoutes = require("./routes/transactionsRoutes")
const merchantsRoutes = require("./routes/merchantsRoutes")
const statsRoutes = require("./routes/statsRoutes")
const demandesRoutes = require("./routes/demandesRoutes")
// const stockRoutes = require("./routes/stockRoutes")
const stockRoutes = require("./routes/stockRoutes")
const demandeQrRoutes = require("./routes/demandeQrRoutes")
const decomRoutes = require("./routes/decomRoutes")
const filesRoutes = require("./routes/filesRoutes")
const gestionTpeRoutes = require("./routes/gestionTpeRoutes")
const rebutRoutes = require("./routes/rebutRoutes")
const notificationsRoutes = require("./routes/notificationsRoutes")

dotenv.config()

const { authentifier, verifierUtilisateur } = require("./middlewares/authMiddleware");
const { optionsCors, protegerCsrf } = require("./middlewares/origine");

// Le secret JWT signe toutes les sessions : un secret absent, court ou laissé à sa valeur d'exemple
// permettrait à n'importe qui de fabriquer un token valide. Le serveur refuse de démarrer dans ce cas.
const SECRETS_INTERDITS = ["JWT_SECRET", "secret", "changeme", "jwt_secret"];
const secretJwt = process.env.JWT_SECRET || "";
if (secretJwt.length < 32 || SECRETS_INTERDITS.includes(secretJwt)) {
    console.error("JWT_SECRET absent ou trop faible (32 caractères minimum, valeur aléatoire). Générez-en un avec :");
    console.error("  node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"");
    process.exit(1);
}

const app = express();
// L'API est derrière nginx sur la même machine : on ne fait confiance à X-Forwarded-For que s'il vient de nginx (loopback).
// Une requête reçue directement sur le port de l'API garde sa vraie IP (en-tête falsifié ignoré).
app.set('trust proxy', 'loopback');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// CORS limité aux origines du front (cookie de session envoyé : credentials)
app.use(cors(optionsCors));
// Journal des requêtes : format détaillé en production (sans corps de requête ni cookies)
const TEST_ENV = require("./utils/consts");
app.use(morgan(TEST_ENV ? 'dev' : 'combined'));
app.use(helmet());


// Initialisation de Prisma
const prisma = new PrismaClient();

// Configuration de la base de données Prisma
const setupDatabase = async () => {
    try {
        await prisma.$connect();
        console.log('Connexion à la base de données réussie.');
    } catch (error) {
        console.error('Erreur de connexion à la base de données:', error);
        process.exit(1);
    }
};
setupDatabase();

// Filet de sécurité : une réponse d'erreur serveur (5xx) ne renvoie jamais d'objet d'erreur interne au navigateur
app.use((req, res, next) => {
    const json = res.json.bind(res);
    res.json = (body) => {
        if (res.statusCode >= 500 && body && typeof body === 'object' && !Array.isArray(body) && 'error' in body) {
            const { error, ...reste } = body;
            return json(reste);
        }
        return json(body);
    };
    next();
});

// Routes accessibles sans être connecté. Toutes les autres routes /api exigent un token valide.
const ROUTES_PUBLIQUES = [
    { methode: 'POST', chemin: /^\/api\/auth\/login\/?$/ },
    { methode: 'POST', chemin: /^\/api\/auth\/forgot-password\/?$/ },
    { methode: 'POST', chemin: /^\/api\/auth\/reset-password\/[^/]+\/?$/ },
];
const estRoutePublique = (req) => ROUTES_PUBLIQUES.some(
    (r) => r.methode === req.method && r.chemin.test(req.originalUrl.split('?')[0])
);
// Protection CSRF sur toutes les requêtes qui modifient des données (y compris le login)
app.use('/api', protegerCsrf);
app.use('/api', (req, res, next) => {
    if (estRoutePublique(req)) return next();
    return authentifier(req, res, (err) => {
        if (err) return next(err);
        // user_id / userId envoyés en JSON ou dans l'URL (?userId=) doivent être ceux du token.
        // Pour le multipart, la vérification est refaite après multer (middlewares/securiserUpload.js).
        return verifierUtilisateur(req, res, next);
    });
});

// Définition des routes
app.use('/api/auth', authRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/receive', receiveRoutes);
app.use('/api/transaction', transactionsRoutes);
app.use('/api/merchants', merchantsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/demandes', demandesRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/demandeQr', demandeQrRoutes);
app.use('/api/decom', decomRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/gestion-tpe', gestionTpeRoutes);
app.use('/api/rebut', rebutRoutes);
app.use('/api/notifications', notificationsRoutes);
// app.use('/api/stock', stockRoutes);




// Gestionnaire d'erreurs : réponse JSON, jamais de pile d'appels renvoyée au navigateur
// (erreurs d'upload multer, fichiers refusés, JSON invalide, erreurs non prévues)
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err && (err.name === 'MulterError' || err.name === 'ErreurUpload')) {
        const messages = {
            LIMIT_FILE_SIZE: "Fichier trop volumineux.",
            LIMIT_FILE_COUNT: "Trop de fichiers.",
            LIMIT_UNEXPECTED_FILE: "Champ de fichier inattendu.",
        };
        return res.status(400).json({ message: messages[err.code] || err.message });
    }
    if (err && err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: "Requête invalide." });
    }
    if (err && err.type === 'entity.too.large') {
        return res.status(413).json({ message: "Requête trop volumineuse." });
    }
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur." });
});

// Démarrage du serveur
const PORT = process.env.PORT || 5500;
// API_HOST=127.0.0.1 dans le .env de production quand nginx est sur la même machine :
// l'API n'est alors plus joignable directement depuis Internet (seulement via nginx).
const HOST = process.env.API_HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
    console.log(`Serveur en cours d'exécution sur ${HOST}:${PORT}`);
});

// Fermeture propre de Prisma
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
