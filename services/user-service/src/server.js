const config = require('./config');
const logger = require('./logger');
const db = require('./db');
const app = require('./app');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
  if (!config.ADMIN_EMAIL || !config.ADMIN_PASSWORD) return;
  const email = config.ADMIN_EMAIL.toLowerCase();
  if (await User.exists({ email })) return;
  await User.create({
    name: 'Administrator',
    email,
    role: 'admin',
    passwordHash: await bcrypt.hash(config.ADMIN_PASSWORD, 12),
  });
  logger.info({ email }, 'Seeded admin user');
}

async function main() {
  await db.connect(config.MONGODB_URI);
  await User.init(); // ensure indexes
  await seedAdmin();

  const server = app.listen(config.PORT, () => logger.info(`user-service listening on :${config.PORT}`));

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');
    // Let the load balancer drain, then stop accepting connections
    server.close(async () => {
      await db.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 25000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (err) => {
  logger.fatal({ err }, 'Unhandled rejection');
  process.exit(1);
});

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});
