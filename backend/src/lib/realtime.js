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

/** FR-22. A saved chat message reaches the customer's room and every signed-in
    staff member. The sender gets it too; the clients de-duplicate by message id. */
export function emitChatMessage({ conversation, message }) {
  if (!io || !conversation || !message) return;

  io.to(`conv:${conversation.customer_id}`)
    .to("staff")
    .emit("message:new", {
      message,
      conversation_id: conversation.id,
      customer_id: conversation.customer_id,
    });
}

/** How many live sockets are in a room. Chat push only fires when this is zero. */
export function roomSize(room) {
  if (!io) return 0;
  return io.sockets.adapter.rooms.get(room)?.size ?? 0;
}
