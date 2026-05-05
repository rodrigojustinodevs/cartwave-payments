'use strict';

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

let prisma;

/**
 * Prisma 7 + adapter pg exige uma connection string; sem ela o SASL falha com
 * "client password must be a string". Monta a partir de DB_* se DATABASE_URL ausente.
 */
function resolveDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (url && String(url).trim()) {
    return url;
  }
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD) : '';
  const name = process.env.DB_NAME || 'cartwave_payments';
  const encUser = encodeURIComponent(user);
  const encPass = encodeURIComponent(password);
  return `postgresql://${encUser}:${encPass}@${host}:${port}/${name}?schema=public`;
}

function getPrisma() {
  if (!prisma) {
    const connectionString = resolveDatabaseUrl();
    const adapter = new PrismaPg({ connectionString });
    prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return prisma;
}

async function disconnect() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

module.exports = { getPrisma, disconnect };
