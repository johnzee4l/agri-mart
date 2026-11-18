import { useEffect, useRef, useState } from "react";
import { Check, ShoppingCartSimple } from "@phosphor-icons/react";
import { cn } from "@/lib/cn.js";
import { formatPHP } from "@/lib/format.js";
import { useCart } from "@/lib/cart.jsx";
import { useAuth } from "@/lib/auth.jsx";
import { stockStatus } from "@/lib/catalog.js";

/* Add to cart, one tap. Out of stock disables the button and says why; the price stays
   on the label so the tap confirms what is being added. The cart only exists for a
   signed-in customer, so the button renders for them alone. */
export default function AddToCart({ product, className }) {
  const { add } = useCart();
  const { isAuthenticated } = useAuth();
  const [added, setAdded] = useState(false);
  const timer = useRef(null);

  const soldOut = stockStatus(product) === "out";

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!isAuthenticated) return null;

  function addOne() {
    if (soldOut) return;

    add(product, 1);
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={addOne}
      disabled={soldOut}
      className={cn(
        "inline-flex h-[var(--control-lg)] w-full items-center justify-center gap-2 rounded-full px-5 text-label font-semibold transition-colors duration-[var(--duration-fast)] ease-standard",
        soldOut
          ? "bg-muted text-fg-subtle"
          : "bg-primary text-on-primary hover:bg-primary-hover",
        className,
      )}
    >
      {added ? (
        <>
          <Check size={20} weight="bold" aria-hidden="true" />
          Added to cart
        </>
      ) : soldOut ? (
        "Out of stock"
      ) : (
        <>
          <ShoppingCartSimple size={20} aria-hidden="true" />
          Add to cart · {formatPHP(product.price)}
        </>
      )}
    </button>
  );
}
