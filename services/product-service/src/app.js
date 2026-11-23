const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const config = require('./config');
const logger = require('./logger');
const health = require('./routes/health');
const { router: products, internal } = require('./routes/products');
const { notFoundHandler, errorHandler } = require('./middleware/error');
const { unauthorized } = require('./errors');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(',') }));
app.use(express.json({ limit: '100kb' }));
app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => ['/healthz', '/readyz', '/metrics'].includes(req.url) },
  }),
);

function requireInternalKey(req, res, next) {
  const provided = Buffer.from(String(req.headers['x-internal-api-key'] || ''));
  const expected = Buffer.from(config.INTERNAL_API_KEY);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return next(unauthorized('Invalid internal API key'));
  }
  return next();
}

app.use(health);
app.use('/api/products', products);
app.use('/internal/products', requireInternalKey, internal);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
