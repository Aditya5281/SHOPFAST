const config = require('./config');
const logger = require('./logger');
const db = require('./db');
const app = require('./app');
const Order = require('./models/Order');

async function main() {
  await db.connect(config.MONGODB_URI);
  await Order.init(); // ensure indexes

  const server = app.listen(config.PORT, () => logger.info(`order-service listening on :${config.PORT}`));

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');
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
