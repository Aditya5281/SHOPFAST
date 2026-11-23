const mongoose = require('mongoose');
const logger = require('./logger');

async function connect(uri) {
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));

  // Cosmos DB for MongoDB: retryWrites must be false (set in the connection string).
  await mongoose.connect(uri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  logger.info('MongoDB connected');
}

const disconnect = () => mongoose.disconnect();

module.exports = { connect, disconnect };
