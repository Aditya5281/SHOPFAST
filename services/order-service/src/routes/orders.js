const express = require('express');
const mongoose = require('mongoose');
const { z } = require('zod');
const Order = require('../models/Order');
const productClient = require('../productClient');
const { authenticate } = require('../middleware/auth');
const { notFound, conflict } = require('../errors');

const router = express.Router();
router.use(authenticate);

const createSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid product id'),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1)
    .max(20),
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function loadId(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Order not found');
  return req.params.id;
}

async function findAccessible(req) {
  const order = await Order.findById(loadId(req));
  // Return 404 (not 403) for other users' orders so ids can't be probed
  if (!order || (req.user.role !== 'admin' && order.userId !== req.user.id)) throw notFound('Order not found');
  return order;
}

router.post('/', async (req, res, next) => {
  const reserved = [];
  try {
    const { items } = createSchema.parse(req.body);

    // Merge duplicate lines for the same product
    const wanted = new Map();
    for (const { productId, quantity } of items) {
      wanted.set(productId, (wanted.get(productId) || 0) + quantity);
    }

    const lines = [];
    for (const [productId, quantity] of wanted) {
      const { product } = await productClient.reserve(productId, quantity);
      reserved.push({ productId, quantity });
      lines.push({ productId, name: product.name, priceCents: product.priceCents, quantity });
    }

    const totalCents = lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
    const order = await Order.create({ userId: req.user.id, items: lines, totalCents });
    res.status(201).json({ order });
  } catch (err) {
    // Saga-style compensation: give back anything already reserved
    await Promise.all(reserved.map((r) => productClient.release(r.productId, r.quantity)));
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { page, limit } = listSchema.parse(req.query);
    const filter = req.user.role === 'admin' ? {} : { userId: req.user.id };
    const [items, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    res.json({ order: await findAccessible(req) });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cancel', async (req, res, next) => {
  try {
    const existing = await findAccessible(req);
    // Atomic status transition prevents double-cancel / double stock release
    const order = await Order.findOneAndUpdate(
      { _id: existing._id, status: 'PLACED' },
      { $set: { status: 'CANCELLED' } },
      { new: true },
    );
    if (!order) throw conflict(`Order is already ${existing.status.toLowerCase()}`);
    await Promise.all(order.items.map((i) => productClient.release(i.productId, i.quantity)));
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
