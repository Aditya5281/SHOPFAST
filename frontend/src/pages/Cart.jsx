import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatPrice } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useCart } from '../cart.jsx';

export default function Cart() {
  const { user } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function checkout() {
    if (!user) return navigate('/login', { state: { from: '/cart' } });
    setError('');
    setBusy(true);
    try {
      await api.placeOrder(cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })));
      cart.clear();
      navigate('/orders');
    } catch (err) {
      // e.g. "Insufficient stock" – the order-service already released any partial reservations
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (cart.lines.length === 0) {
    return (
      <>
        <h1>Your cart</h1>
        <p className="muted">
          Your cart is empty. <Link to="/">Browse products</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Your cart</h1>
      {error && <p className="error">{error}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Price</th>
            <th>Qty</th>
            <th>Subtotal</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {cart.lines.map((l) => (
            <tr key={l.productId}>
              <td>{l.name}</td>
              <td>{formatPrice(l.priceCents)}</td>
              <td>
                <input
                  className="qty"
                  type="number"
                  min={1}
                  max={100}
                  value={l.quantity}
                  onChange={(e) => cart.setQuantity(l.productId, Number(e.target.value) || 1)}
                />
              </td>
              <td>{formatPrice(l.priceCents * l.quantity)}</td>
              <td>
                <button className="btn btn-secondary" onClick={() => cart.remove(l.productId)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row total">
        <strong>Total: {formatPrice(cart.totalCents)}</strong>
        <button className="btn" onClick={checkout} disabled={busy}>
          {busy ? 'Placing order…' : user ? 'Place order' : 'Log in to order'}
        </button>
      </div>
    </>
  );
}
