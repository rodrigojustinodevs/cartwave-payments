import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

let prisma: PrismaClient | undefined;

function resolveDatabaseUrl(): string {
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

function getPrisma(): PrismaClient {
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

async function disconnect(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
  }
}

export { getPrisma, disconnect };
