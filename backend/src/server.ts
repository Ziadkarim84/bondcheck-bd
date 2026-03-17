import 'dotenv/config';
import { createApp } from './app';
import prisma from './db';
import { startScheduler } from './jobs/scheduler';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function main() {
  const app = createApp();

  await prisma.$connect();
  console.log('✅ Database connected');

  startScheduler();
  console.log('✅ Scheduler started');

  const server = app.listen(PORT, () => {
    console.log(`✅ API server running on http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    console.log('Shutting down...');
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
