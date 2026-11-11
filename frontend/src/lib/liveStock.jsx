import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth.jsx";
import { disconnectSocket, onStock } from "./socket.js";

/* D6. Live stock. The server emits `stock { product_id, stock_qty }` after every
   deduction or adjustment (blueprint 6.3); components read the merged value and flash
   the change (designtokens 13). */

const LiveStockContext = createContext({ updates: {} });

export function LiveStockProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [updates, setUpdates] = useState({});

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const unsubscribe = onStock((payload) => {
      const id = payload?.product_id;
      const quantity = Number(payload?.stock_qty);
      if (!id || !Number.isFinite(quantity)) return;
      setUpdates((current) => ({ ...current, [id]: { quantity, at: Date.now() } }));
    });

    return unsubscribe;
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) return;
    disconnectSocket();
  }, [isAuthenticated]);

  const value = useMemo(() => ({ updates }), [updates]);

  return <LiveStockContext.Provider value={value}>{children}</LiveStockContext.Provider>;
}

export function useLiveStock() {
  return useContext(LiveStockContext);
}

/** Merges the latest broadcast stock into a product, with the time it changed. */
export function useLiveProduct(product) {
  const { updates } = useLiveStock();
  const update = product ? updates[product.id] : undefined;

  return useMemo(() => {
    if (!product || !update) return { product, changedAt: null };
    return {
      product: { ...product, stock_qty: update.quantity },
      changedAt: update.at,
    };
  }, [product, update]);
}
