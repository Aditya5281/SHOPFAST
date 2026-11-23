// Thin fetch wrapper. All calls go to same-origin /api/* (nginx or the Vite proxy routes them).
const TOKEN_KEY = 'shopfast_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(status, body) {
    const err = body?.error;
    const detail = err?.details?.map((d) => `${d.path}: ${d.message}`).join('; ');
    super(detail || err?.message || `Request failed (${status})`);
    this.status = status;
    this.code = err?.code;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

async function request(method, path, body) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // Expired/invalid token on an authenticated call -> force logout
    if (res.status === 401 && token && !path.startsWith('/api/auth/login')) onUnauthorized();
    throw new ApiError(res.status, data);
  }
  return data;
}

export const api = {
  register: (name, email, password) => request('POST', '/api/auth/register', { name, email, password }),
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  me: () => request('GET', '/api/auth/me'),

  listProducts: ({ page = 1, limit = 12, q = '', category = '' } = {}) => {
    const p = new URLSearchParams({ page, limit });
    if (q) p.set('q', q);
    if (category) p.set('category', category);
    return request('GET', `/api/products?${p}`);
  },
  createProduct: (data) => request('POST', '/api/products', data),
  updateProduct: (id, data) => request('PUT', `/api/products/${id}`, data),
  deleteProduct: (id) => request('DELETE', `/api/products/${id}`),

  placeOrder: (items) => request('POST', '/api/orders', { items }),
  listOrders: ({ page = 1, limit = 10 } = {}) => request('GET', `/api/orders?page=${page}&limit=${limit}`),
  cancelOrder: (id) => request('POST', `/api/orders/${id}/cancel`),
};

export const formatPrice = (cents) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);
