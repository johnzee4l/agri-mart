/* D6, C2. The stock socket event (blueprint 6.3). index.js hands the Socket.IO
   server over at boot, so order and inventory code can broadcast without importing
   the HTTP bootstrap and creating a cycle. */

let io = null;

export function setRealtime(server) {
  io = server;
}

/** Broadcasts the new quantity of every touched product. */
export function emitStock(products) {
  if (!io || !Array.isArray(products)) return;

  for (const product of products) {
    if (!product?.id) continue;
    io.emit("stock", { product_id: product.id, stock_qty: product.stock_qty });
  }
}
