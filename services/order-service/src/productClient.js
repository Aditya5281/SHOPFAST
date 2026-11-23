const config = require('./config');
const logger = require('./logger');
const { AppError } = require('./errors');

async function post(path, body) {
  let res;
  try {
    res = await fetch(`${config.PRODUCT_SERVICE_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-api-key': config.INTERNAL_API_KEY },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.PRODUCT_SERVICE_TIMEOUT_MS),
    });
  } catch (err) {
    logger.error({ err, path }, 'product-service unreachable');
    throw new AppError(503, 'Product service unavailable', 'UPSTREAM_UNAVAILABLE');
  }

  const data = await res.json().catch(() => ({}));
  if (res.ok) return data;

  if (res.status === 404) throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  if (res.status === 400) {
    throw new AppError(409, data?.error?.message || 'Unable to reserve product', 'INSUFFICIENT_STOCK');
  }
  logger.error({ status: res.status, path }, 'product-service error');
  throw new AppError(502, 'Product service error', 'UPSTREAM_ERROR');
}

/** Atomically reserve stock. Returns the product (with current name/price). */
const reserve = (productId, quantity) => post(`/internal/products/${productId}/reserve`, { quantity });

/** Return stock (compensation / cancellation). Best-effort, never throws. */
async function release(productId, quantity) {
  try {
    await post(`/internal/products/${productId}/release`, { quantity });
  } catch (err) {
    logger.error({ err, productId, quantity }, 'FAILED to release stock - needs manual reconciliation');
  }
}

module.exports = { reserve, release };
