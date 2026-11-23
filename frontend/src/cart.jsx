import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const KEY = 'shopfast_cart';
const MAX_QTY = 100; // matches order-service limit per line

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

// Cart line: { productId, name, priceCents, quantity }
export function CartProvider({ children }) {
  const [lines, setLines] = useState(load);

  useEffect(() => localStorage.setItem(KEY, JSON.stringify(lines)), [lines]);

  const value = useMemo(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      totalCents: lines.reduce((s, l) => s + l.priceCents * l.quantity, 0),
      add(product, quantity = 1) {
        setLines((prev) => {
          const existing = prev.find((l) => l.productId === product.id);
          if (existing) {
            return prev.map((l) =>
              l.productId === product.id ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) } : l,
            );
          }
          return [...prev, { productId: product.id, name: product.name, priceCents: product.priceCents, quantity }];
        });
      },
      setQuantity(productId, quantity) {
        setLines((prev) =>
          prev.map((l) => (l.productId === productId ? { ...l, quantity: Math.max(1, Math.min(MAX_QTY, quantity)) } : l)),
        );
      },
      remove: (productId) => setLines((prev) => prev.filter((l) => l.productId !== productId)),
      clear: () => setLines([]),
    }),
    [lines],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
