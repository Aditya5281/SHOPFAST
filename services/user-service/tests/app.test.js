process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.LOG_LEVEL = 'silent';

const request = require('supertest');
const app = require('../src/app');

describe('user-service (no database required)', () => {
  test('GET /healthz returns ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /readyz is 503 when DB is not connected', async () => {
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(503);
  });

  test('POST /api/auth/register validates input', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'nope', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('GET /api/auth/me requires a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('unknown route returns 404', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
  });
});
