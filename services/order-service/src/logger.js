const pino = require('pino');

module.exports = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'order-service' },
  redact: ['req.headers.authorization', 'req.headers.cookie', 'password', '*.password'],
});
