const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const config = require('../config');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { unauthorized, notFound, conflict } = require('../errors');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});
const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128),
});

// Throttle credential endpoints to slow brute-force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
});

const signToken = (user) =>
  jwt.sign({ role: user.role }, config.JWT_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    expiresIn: config.JWT_EXPIRES_IN,
  });

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    if (await User.exists({ email: body.email.toLowerCase() })) throw conflict('Email already registered');
    const user = await User.create({
      name: body.name,
      email: body.email,
      passwordHash: await bcrypt.hash(body.password, 12),
    });
    res.status(201).json({ user, token: signToken(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await User.findOne({ email: body.email.toLowerCase() });
    // Same error for unknown email / bad password to avoid user enumeration
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw unauthorized('Invalid email or password');
    }
    res.json({ user, token: signToken(user) });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) throw notFound('User not found');
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
