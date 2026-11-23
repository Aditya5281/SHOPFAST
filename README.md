# ShopFast – Node.js microservices

| Service | Port | Gateway path | Responsibility |
|---|---|---|---|
| user-service | 3001 | `/api/auth/*` | Register / login (bcrypt + JWT), `/me`, admin seeding |
| product-service | 3002 | `/api/products/*` | Catalog CRUD (admin writes), atomic stock reserve/release on `/internal/*` |
| order-service | 3003 | `/api/orders/*` | Place / list / cancel orders; reserves stock via product-service, compensates on failure |

| frontend | 8080 | `/` | React (Vite) SPA served by nginx; also the gateway that proxies `/api/*` to the services above (`/internal/*` is never routed) |

Each service has its own MongoDB database (`shopfast_users`, `shopfast_products`, `shopfast_orders`) – no shared DB.

## Run locally
```bash
docker compose up --build
```

Open http://localhost:8080 for the web UI. Log in as `admin@shopfast.local` / `ChangeMe123!` to manage products at `/admin`, or sign up as a normal customer.

Frontend dev with hot reload (services running via compose):
```bash
cd frontend && npm install && npm run dev   # http://localhost:5173
```

## Try it (API only)
```bash
# login as seeded admin
TOKEN=$(curl -s localhost:3001/api/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@shopfast.local","password":"ChangeMe123!"}' | jq -r .token)

# create a product
curl -s localhost:3002/api/products -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"sku":"TSHIRT-1","name":"T-Shirt","priceCents":1999,"stock":10}'

# place an order (use the product id returned above)
curl -s localhost:3003/api/orders -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"items":[{"productId":"<id>","quantity":2}]}'
```

## Tests
`cd services/<name> && npm test`

## Production notes
- Config only via env vars, validated at startup (zod). Secrets (`MONGODB_URI`, `JWT_SECRET`, `INTERNAL_API_KEY`) will come from Key Vault.
- `/healthz` (liveness), `/readyz` (Mongo connectivity), `/metrics` (Prometheus).
- Graceful shutdown on SIGTERM, structured JSON logs (pino) with auth headers redacted.
- Cosmos DB Mongo API: use a connection string with `retryWrites=false`; avoid multi-document transactions (none are used).
- `/internal/*` routes are protected by an API key and must not be exposed by the App Gateway ingress.
- Multi-stage Dockerfiles, non-root user.
