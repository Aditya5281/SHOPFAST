process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.INTERNAL_API_KEY = 'internal-key-internal-key';
process.env.LOG_LEVEL = 'silent';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const token = jwt.sign({ role: 'user' }, process.env.JWT_SECRET, { subject: 'u1', expiresIn: '5m' });

describe('order-service (no database required)', () => {
  test('GET /healthz returns ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
  });

  test('orders require authentication', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });

  test('rejects an expired/invalid token', async () => {
    const res = await request(app).get('/api/orders').set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
  });

  test('validates order payload', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: 'bad', quantity: 0 }] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
