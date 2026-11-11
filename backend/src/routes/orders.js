import { Router } from "express";
import { notImplemented } from "../middleware.js";

/* FR-5, FR-8. Member 2 Phase 3: create (server-side prices, stock and archived
   checks), list, get, cancel while pending, status change. */
export const ordersRouter = Router();

ordersRouter.get("/", notImplemented);
ordersRouter.post("/", notImplemented);
ordersRouter.get("/:id", notImplemented);
ordersRouter.post("/:id/cancel", notImplemented);
ordersRouter.patch("/:id/status", notImplemented);
