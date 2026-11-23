const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3003),
  LOG_LEVEL: z.string().default('info'),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  INTERNAL_API_KEY: z.string().min(16),
  // In Kubernetes this is the product-service ClusterIP service DNS name
  PRODUCT_SERVICE_URL: z.string().url().default('http://product-service:3002'),
  PRODUCT_SERVICE_TIMEOUT_MS: z.coerce.number().default(5000),
  CORS_ORIGIN: z.string().default('*'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsed.data;
