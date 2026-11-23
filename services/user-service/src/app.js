const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const config = require('./config');
const logger = require('./logger');
const health = require('./routes/health');
const auth = require('./routes/auth');
const { notFoundHandler, errorHandler } = require('./middleware/error');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1); // behind Application Gateway / ingress

app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(',') }));
app.use(express.json({ limit: '100kb' }));
app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => ['/healthz', '/readyz', '/metrics'].includes(req.url) },
  }),
);

app.use(health);
app.use('/api/auth', auth);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
