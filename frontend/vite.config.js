import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, mimic the nginx gateway: route /api/* to the right service on localhost.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/auth': 'http://localhost:3001',
      '/api/products': 'http://localhost:3002',
      '/api/orders': 'http://localhost:3003',
    },
  },
});
