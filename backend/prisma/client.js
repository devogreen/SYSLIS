// prisma/client.js
const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

/** @type {PrismaClient} */
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // optional: log: ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;