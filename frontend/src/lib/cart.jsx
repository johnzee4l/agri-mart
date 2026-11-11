import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/* FR-4. The cart lives in the browser (blueprint 3.2). Prices and totals are always
   recalculated by the server at checkout, so what is stored here is only what the
   customer needs to see. */

const CartContext = createContext(null);
const STORAGE_KEY = "agrimart.cart";

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // A corrupt or unavailable store must not break the app.
    return [];
  }
}

/** Keeps only the fields the cart needs, so a product change cannot break an old cart. */
function snapshot(product) {
  return {
    id: product.id,
    name: product.name,
    price: Number(product.price ?? 0),
    unit: product.unit ?? null,
    image_url: product.image_url ?? null,
    stock_qty: Number(product.stock_qty ?? 0),
  };
}

function clamp(quantity, stock) {
  if (stock > 0) return Math.min(quantity, stock);
  return quantity;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Quota or private mode: the cart still works for this session.
    }
  }, [items]);

  const add = useCallback((product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, ...snapshot(product), quantity: clamp(item.quantity + quantity, item.stock_qty) }
            : item,
        );
      }
      return [...current, { ...snapshot(product), quantity: clamp(quantity, Number(product.stock_qty ?? 0)) }];
    });
  }, []);

  const setQuantity = useCallback((id, quantity) => {
    setItems((current) => {
      if (quantity <= 0) return current.filter((item) => item.id !== id);
      return current.map((item) =>
        item.id === id ? { ...item, quantity: clamp(quantity, item.stock_qty) } : item,
      );
    });
  }, []);

  const remove = useCallback((id) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((total, item) => total + item.quantity, 0);
    const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
    return { items, count, subtotal, add, setQuantity, remove, clear };
  }, [items, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
