/* Socket.IO attach point (dependency D12). Member 3 owns this file (FR-22).
   Phase 4: verify the handshake token, join conv:<customerId> for customers and
   the "staff" room for staff/admin, save to messages, then emit message:new. */
export function initChat(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token ?? null;
    if (!token) return next(new Error("Missing access token"));
    // TODO(Member 3, Phase 4): verify the token with Supabase and load the role.
    return next();
  });

  io.on("connection", (socket) => {
    // TODO(Member 3, Phase 4): join rooms, handle "message:send".
    socket.emit("chat:ready", { connected: true, rooms: [] });
  });
}
