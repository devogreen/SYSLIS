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

dotenv.config()

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));
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

// Définition des routes
app.use('/api/auth', authRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/receive', receiveRoutes);
app.use('/api/transaction', transactionsRoutes);
app.use('/api/merchants', merchantsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/demandes', demandesRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/demandeQr', demandeQrRoutes)
// app.use('/api/stock', stockRoutes);




// Démarrage du serveur
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});

// Fermeture propre de Prisma
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
