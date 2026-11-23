const express = require('express');
const mongoose = require('mongoose');
const client = require('prom-client');

const router = express.Router();
client.collectDefaultMetrics({ prefix: 'product_service_' });

// Liveness: process is up
router.get('/healthz', (req, res) => res.json({ status: 'ok' }));

// Readiness: dependencies are reachable
router.get('/readyz', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not-ready' });
});

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

module.exports = router;
