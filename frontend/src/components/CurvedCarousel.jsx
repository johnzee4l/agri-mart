import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/cn.js";
import { formatPHP } from "@/lib/format.js";

/* 3D curved carousel (designtokens 12.1, reference: 3D Curved Carousel). Cards sit on
   a cylinder: each step recedes on Z, slides on X and turns on Y toward the centre, so
   the row bends like a lens. It rotates without end: the offsets wrap, so the card that
   leaves one edge comes back on the other. */

const SPACING_REM = 11;
const DEPTH_REM = 5.5;
const ANGLE = 20;

/* Signed shortest distance around the ring, in the range [-n/2, n/2). */
function ringOffset(index, active, size) {
  let offset = (index - active) % size;
  if (offset > size / 2) offset -= size;
  if (offset < -size / 2) offset += size;
  return offset;
}

export default function CurvedCarousel({ items, label = "Fresh stock" }) {
  const size = items.length;
  const [active, setActive] = useState(Math.floor((size - 1) / 2));
  const prevActive = useRef(active);
  const startX = useRef(null);
  const dragged = useRef(false);

  useEffect(() => {
    prevActive.current = active;
  }, [active]);

  const go = (delta) => setActive((current) => (current + delta + size) % size);

  const onPointerDown = (event) => {
    startX.current = event.clientX;
    dragged.current = false;
  };

  const onPointerMove = (event) => {
    if (startX.current === null) return;
    const delta = event.clientX - startX.current;
    if (Math.abs(delta) < 48) return;
    go(delta < 0 ? 1 : -1);
    startX.current = event.clientX;
    dragged.current = true;
  };

  const onPointerUp = () => {
    startX.current = null;
    window.setTimeout(() => {
      dragged.current = false;
    }, 250);
  };

  const current = items[active];

  return (
    <section
      aria-label={label}
      className="mx-auto w-full max-w-[var(--container-wide)] px-4 lg:px-10"
    >
      <div className="relative mx-auto w-full max-w-[60rem] overflow-hidden rounded-2xl bg-surface">
        <div className="flex items-center justify-between gap-3 px-6 pt-5 text-caption font-semibold text-fg-muted">
          <span>Fresh stock — this week</span>
          <span className="hidden sm:inline">Drag to wander, or use the arrows</span>
        </div>

        <div
          role="group"
          aria-label="Product carousel"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{ perspective: "60rem" }}
          className="relative h-72 touch-pan-y select-none sm:h-80 lg:h-[26rem]"
        >
          <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
            {items.map((product, index) => {
              const offset = ringOffset(index, active, size);
              const previous = ringOffset(index, prevActive.current, size);
              // A card that wrapped to the other edge must jump, not sweep across.
              const wrapped = Math.abs(offset - previous) > size / 2;

              return (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  onClick={(event) => {
                    if (dragged.current) event.preventDefault();
                  }}
                  tabIndex={Math.abs(offset) <= 1 ? 0 : -1}
                  style={{
                    transform: `translate(-50%, -50%) translateX(${offset * SPACING_REM}rem) translateZ(${
                      -Math.abs(offset) * DEPTH_REM
                    }rem) rotateY(${-offset * ANGLE}deg)`,
                    transition: wrapped ? "none" : undefined,
                    zIndex: 10 - Math.abs(offset),
                  }}
                  className={cn(
                    "absolute top-1/2 left-1/2 block h-56 w-36 overflow-hidden rounded-xl bg-muted sm:h-64 sm:w-40 lg:h-72 lg:w-44",
                    "transition-transform duration-[var(--duration-slow)] ease-standard",
                  )}
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt=""
                      loading="lazy"
                      draggable="false"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-6">
          <div className="min-w-0" aria-live="polite">
            {current.brand ? (
              <p className="text-caption text-fg-muted">{current.brand}</p>
            ) : null}
            <h2 className="truncate text-heading-md text-fg">{current.name}</h2>
            <p className="text-label font-semibold text-fg tabular-nums">
              {formatPHP(current.price)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="mr-1 text-caption text-fg-muted tabular-nums">
              {String(active + 1).padStart(2, "0")} / {String(size).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous product"
              className="flex size-10 items-center justify-center rounded-full bg-muted text-fg transition-colors duration-[var(--duration-fast)] hover:bg-muted/70"
            >
              <CaretLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next product"
              className="flex size-10 items-center justify-center rounded-full bg-muted text-fg transition-colors duration-[var(--duration-fast)] hover:bg-muted/70"
            >
              <CaretRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
