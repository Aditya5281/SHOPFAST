const express = require('express');
const mongoose = require('mongoose');
const { z } = require('zod');
const Product = require('../models/Product');
const { authenticate, requireRole } = require('../middleware/auth');
const { notFound, badRequest } = require('../errors');

const router = express.Router();

const createSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().min(1).max(64).optional(),
  priceCents: z.number().int().min(0),
  stock: z.number().int().min(0).default(0),
});
const updateSchema = createSchema.partial().refine((v) => Object.keys(v).length > 0, 'No fields to update');

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().trim().toLowerCase().optional(),
  q: z.string().trim().max(100).optional(),
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function loadId(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Product not found');
  return req.params.id;
}

// ---- Public catalog API (exposed through the gateway) ----

router.get('/', async (req, res, next) => {
  try {
    const { page, limit, category, q } = listSchema.parse(req.query);
    const filter = {};
    if (category) filter.category = category;
    if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(loadId(req));
    if (!product) throw notFound('Product not found');
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const product = await Product.create(createSchema.parse(req.body));
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const update = updateSchema.parse(req.body);
    const product = await Product.findByIdAndUpdate(loadId(req), { $set: update }, { new: true, runValidators: true });
    if (!product) throw notFound('Product not found');
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(loadId(req));
    if (!product) throw notFound('Product not found');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ---- Internal API (cluster-only; not routed by the gateway) ----

const internal = express.Router();
const qtySchema = z.object({ quantity: z.number().int().min(1).max(1000) });

// Atomically decrement stock only if enough is available (no oversell under concurrency)
internal.post('/:id/reserve', async (req, res, next) => {
  try {
    const { quantity } = qtySchema.parse(req.body);
    const product = await Product.findOneAndUpdate(
      { _id: loadId(req), stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { new: true },
    );
    if (!product) {
      const exists = await Product.exists({ _id: req.params.id });
      if (!exists) throw notFound('Product not found');
      throw badRequest('Insufficient stock');
    }
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

internal.post('/:id/release', async (req, res, next) => {
  try {
    const { quantity } = qtySchema.parse(req.body);
    const product = await Product.findByIdAndUpdate(loadId(req), { $inc: { stock: quantity } }, { new: true });
    if (!product) throw notFound('Product not found');
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

module.exports = { router, internal };
