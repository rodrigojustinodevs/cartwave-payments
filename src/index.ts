import 'dotenv/config';

import { getPrisma, disconnect } from './infrastructure/database/prisma.js';
import { createApp } from './app.js';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('JWT_SECRET is required in production');
  process.exit(1);
}

async function main(): Promise<void> {
  const prisma = getPrisma();

  const gatewayUrl = process.env.PAYMENT_PROVIDER_URL || process.env.PAYMENT_PROVIDER_BASE_URL;
  const app = createApp(prisma, gatewayUrl);
  const PORT = Number(process.env.PORT) || 3000;

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cartwave Payments API running on port ${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}, shutting down...`);
    server.close(() => {
      disconnect()
        .then(() => process.exit(0))
        .catch((err) => {
          console.error(err);
          process.exit(1);
        });
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
