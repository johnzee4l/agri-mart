import http from "node:http";
import { Server } from "socket.io";

import { app, allowedOrigins } from "./app.js";
import { initChat } from "./chat.js";
import { setRealtime } from "./lib/realtime.js";
import { sweepScheduledAnnouncements } from "./routes/announcements.js";

/* API bootstrap for a long-lived process: the Express app from app.js plus one HTTP
   server carrying Socket.IO on the same port. Vercel runs the app alone through
   api/[...path].js, where chat uses its REST routes instead. */
const server = http.createServer(app);

// Socket.IO attach point shared with backend/src/chat.js (D12).
const io = new Server(server, {
  cors: { origin: allowedOrigins },
});
setRealtime(io);
initChat(io);

const port = Number(process.env.PORT ?? 4000);
server.listen(port, () => {
  const address = server.address();
  // PORT=0 asks the OS for a free port, so log the one actually bound.
  const boundPort = typeof address === "object" && address ? address.port : port;
  console.log(`[api] listening on http://localhost:${boundPort}`);
});

/* A scheduled announcement becomes public while the clock moves, with or without an
   admin save. The sweep is tiny and unref'd so it never keeps the process alive. */
function runAnnouncementSweep() {
  sweepScheduledAnnouncements().catch((error) =>
    console.error("[announcements] sweep failed:", error?.message ?? error),
  );
}

runAnnouncementSweep();
const announcementTimer = setInterval(runAnnouncementSweep, 60_000);
announcementTimer.unref?.();

export { app, server, io };
