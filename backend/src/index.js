import http from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { Server } from "socket.io";

import { ApiError, errorHandler, notFound } from "./middleware.js";
import { initChat } from "./chat.js";
import { setRealtime } from "./lib/realtime.js";

import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";
import { catalogRouter } from "./routes/catalog.js";
import { announcementsRouter } from "./routes/announcements.js";
import { contentRouter } from "./routes/content.js";
import { uploadsRouter } from "./routes/uploads.js";
import { ordersRouter } from "./routes/orders.js";
import { paymentsRouter } from "./routes/payments.js";
import { inventoryRouter } from "./routes/inventory.js";
import { usersRouter } from "./routes/users.js";
import { reportsRouter } from "./routes/reports.js";
import { chatRouter } from "./routes/chat.js";
import { pushRouter } from "./routes/push.js";

/* API bootstrap: Express 5 + one HTTP server + Socket.IO on the same port. */
const app = express();

const allowedOrigins = (process.env.FRONTEND_URL ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");

/* Behind Render (or any proxy) the client IP arrives in X-Forwarded-For, and
   express-rate-limit refuses to guess: without a trusted hop it keys every visitor on
   the proxy and eventually 500s on the unexpected header. Off by default, so a direct
   run cannot be limited by a header the caller made up. */
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      // A rejected origin is a client error, not a server fault.
      return callback(new ApiError(403, "Origin not allowed"));
    },
  }),
);
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);
// Keep the raw body: the PayMongo webhook verifies its signature over these bytes.
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buffer) => {
      req.rawBody = buffer;
    },
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "agrimart-api", time: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api", catalogRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/content", contentRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/users", usersRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/push", pushRouter);

app.use(notFound);
app.use(errorHandler);

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

export { app, server, io };
