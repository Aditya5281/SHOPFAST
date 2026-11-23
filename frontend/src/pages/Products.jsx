import { useEffect, useState } from 'react';
import { api, formatPrice } from '../api.js';
import { useCart } from '../cart.jsx';

const LIMIT = 12;

export default function Products() {
  const cart = useCart();
  const [data, setData] = useState({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listProducts({ page, limit: LIMIT, q })
      .then((res) => !cancelled && (setData(res), setError('')))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, q]);

  const pages = Math.max(1, Math.ceil(data.total / LIMIT));

  function onSearch(e) {
    e.preventDefault();
    setPage(1);
    setQ(search.trim());
  }

  function addToCart(p) {
    cart.add(p);
    setAdded(p.id);
    setTimeout(() => setAdded((cur) => (cur === p.id ? null : cur)), 1200);
  }

  return (
    <>
      <div className="row">
        <h1>Products</h1>
        <form className="search" onSubmit={onSearch}>
          <input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn">Search</button>
        </form>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && !error && data.items.length === 0 && <p className="muted">No products found.</p>}

      <div className="grid">
        {data.items.map((p) => (
          <article key={p.id} className="card product">
            <span className="tag">{p.category}</span>
            <h3>{p.name}</h3>
            <p className="muted desc">{p.description}</p>
            <div className="row">
              <strong>{formatPrice(p.priceCents)}</strong>
              <span className={p.stock > 0 ? 'muted' : 'error-text'}>
                {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
              </span>
            </div>
            <button className="btn" disabled={p.stock === 0} onClick={() => addToCart(p)}>
              {added === p.id ? 'Added ✓' : 'Add to cart'}
            </button>
          </article>
        ))}
      </div>

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
