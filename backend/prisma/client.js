// prisma/client.js
const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

/** @type {PrismaClient} */
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // optional: log: ['warn', 'error'],
    // Les secrets des utilisateurs ne sortent jamais d'une requête (y compris via include: { users: true }).
    // Pour les lire (login, changement de mot de passe) : omit: { password: false } sur la requête concernée.
    omit: {
      users: { password: true, reset_token: true, reset_expires: true },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;