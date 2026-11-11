import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Check } from "@phosphor-icons/react";
import Button from "./ui/Button.jsx";
import { useCart } from "@/lib/cart.jsx";
import { stockStatus } from "@/lib/catalog.js";

/* FR-4 with the add-to-cart morph (designtokens 9.3): the label crossfades to a
   check and the cart badge scales in the navbar. */
export default function AddToCartButton({ product, size = "md", className }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const soldOut = stockStatus(product) === "out";

  const handleAdd = () => {
    add(product, 1);
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <Button
      size={size}
      variant={soldOut ? "secondary" : "primary"}
      disabled={soldOut}
      onClick={handleAdd}
      className={className}
      aria-live="polite"
    >
      <AnimatePresence initial={false} mode="wait">
        {added ? (
          <m.span
            key="added"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2"
          >
            <Check size={20} weight="bold" aria-hidden="true" />
            Added
          </m.span>
        ) : (
          <m.span
            key="add"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {soldOut ? "Out of stock" : "Add to cart"}
          </m.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
