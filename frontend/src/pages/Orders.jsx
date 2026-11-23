import { useCallback, useEffect, useState } from 'react';
import { api, formatPrice } from '../api.js';

const LIMIT = 10;

export default function Orders() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    return api
      .listOrders({ page, limit: LIMIT })
      .then((res) => (setData(res), setError('')))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel(id) {
    if (!window.confirm('Cancel this order?')) return;
    setCancelling(id);
    try {
      await api.cancelOrder(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(null);
    }
  }

  const pages = Math.max(1, Math.ceil(data.total / LIMIT));

  return (
    <>
      <h1>My orders</h1>
      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && data.items.length === 0 && <p className="muted">You have no orders yet.</p>}

      {data.items.map((o) => (
        <article key={o.id} className="card order">
          <div className="row">
            <div>
              <strong>Order #{o.id.slice(-8)}</strong>
              <div className="muted">{new Date(o.createdAt).toLocaleString()}</div>
            </div>
            <span className={`status status-${o.status.toLowerCase()}`}>{o.status}</span>
          </div>
          <ul>
            {o.items.map((i) => (
              <li key={i.productId}>
                {i.quantity} × {i.name} — {formatPrice(i.priceCents * i.quantity)}
              </li>
            ))}
          </ul>
          <div className="row">
            <strong>Total: {formatPrice(o.totalCents)}</strong>
            {o.status === 'PLACED' && (
              <button className="btn btn-secondary" disabled={cancelling === o.id} onClick={() => cancel(o.id)}>
                {cancelling === o.id ? 'Cancelling…' : 'Cancel order'}
              </button>
            )}
          </div>
        </article>
      ))}

      {pages > 1 && (
        <div className="pager">
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span className="muted">
            Page {page} of {pages}
          </span>
          <button className="btn btn-secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </>
  );
}
