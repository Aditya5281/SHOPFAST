import { useCallback, useEffect, useState } from 'react';
import { api, formatPrice } from '../api.js';

const EMPTY = { sku: '', name: '', description: '', category: '', price: '', stock: '0' };

export default function Admin() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      api
        .listProducts({ limit: 100 })
        .then((res) => setItems(res.items))
        .catch((err) => setError(err.message)),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function edit(p) {
    setEditingId(p.id);
    setForm({
      sku: p.sku,
      name: p.name,
      description: p.description || '',
      category: p.category || '',
      price: (p.priceCents / 100).toFixed(2),
      stock: String(p.stock),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const payload = {
      sku: form.sku,
      name: form.name,
      priceCents: Math.round(parseFloat(form.price) * 100),
      stock: parseInt(form.stock, 10),
    };
    if (form.description) payload.description = form.description;
    if (form.category) payload.category = form.category;
    try {
      if (editingId) await api.updateProduct(editingId, payload);
      else await api.createProduct(payload);
      reset();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(p) {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    try {
      await api.deleteProduct(p.id);
      if (editingId === p.id) reset();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <h1>Manage products</h1>
      {error && <p className="error">{error}</p>}

      <form className="card form wide" onSubmit={onSubmit}>
        <h2>{editingId ? 'Edit product' : 'New product'}</h2>
        <div className="form-grid">
          <label>
            SKU
            <input value={form.sku} onChange={set('sku')} required maxLength={64} />
          </label>
          <label>
            Name
            <input value={form.name} onChange={set('name')} required maxLength={200} />
          </label>
          <label>
            Category
            <input value={form.category} onChange={set('category')} maxLength={64} placeholder="general" />
          </label>
          <label>
            Price (USD)
            <input type="number" step="0.01" min="0" value={form.price} onChange={set('price')} required />
          </label>
          <label>
            Stock
            <input type="number" step="1" min="0" value={form.stock} onChange={set('stock')} required />
          </label>
        </div>
        <label>
          Description
          <textarea value={form.description} onChange={set('description')} maxLength={2000} rows={3} />
        </label>
        <div className="row">
          <button className="btn" disabled={busy}>
            {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create product'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={reset}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th>Price</th>
            <th>Stock</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td>{p.sku}</td>
              <td>{p.name}</td>
              <td>{formatPrice(p.priceCents)}</td>
              <td>{p.stock}</td>
              <td className="actions">
                <button className="btn btn-secondary" onClick={() => edit(p)}>
                  Edit
                </button>
                <button className="btn btn-danger" onClick={() => remove(p)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
