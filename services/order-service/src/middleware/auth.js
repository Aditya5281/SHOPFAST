const jwt = require('jsonwebtoken');
const config = require('../config');
const { unauthorized, forbidden } = require('../errors');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(unauthorized('Missing bearer token'));
  try {
    const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return next(unauthorized('Invalid or expired token'));
  }
}

const requireRole = (role) => (req, res, next) =>
  req.user && req.user.role === role ? next() : next(forbidden('Insufficient permissions'));

module.exports = { authenticate, requireRole };
