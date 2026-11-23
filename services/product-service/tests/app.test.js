process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.INTERNAL_API_KEY = 'internal-key-internal-key';
process.env.LOG_LEVEL = 'silent';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const token = (role) => jwt.sign({ role }, process.env.JWT_SECRET, { subject: 'u1', expiresIn: '5m' });

describe('product-service (no database required)', () => {
  test('GET /healthz returns ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
  });

  test('creating a product requires auth', async () => {
    const res = await request(app).post('/api/products').send({});
    expect(res.status).toBe(401);
  });

  test('creating a product requires admin role', async () => {
    const res = await request(app).post('/api/products').set('Authorization', `Bearer ${token('user')}`).send({});
    expect(res.status).toBe(403);
  });

  test('admin gets validation errors for bad payload', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token('admin')}`)
      .send({ name: 'x', priceCents: -5 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('internal endpoints reject missing API key', async () => {
    const res = await request(app).post('/internal/products/abc/reserve').send({ quantity: 1 });
    expect(res.status).toBe(401);
  });

  test('invalid product id returns 404', async () => {
    const res = await request(app).get('/api/products/not-an-id');
    expect(res.status).toBe(404);
  });
});
