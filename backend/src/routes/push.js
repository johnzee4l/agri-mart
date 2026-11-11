import { Router } from "express";
import { notImplemented } from "../middleware.js";

/* FR-21. Member 2 Phase 4 (C1) or Phase 5: Web Push subscription management. */
export const pushRouter = Router();

pushRouter.get("/public-key", notImplemented);
pushRouter.post("/subscribe", notImplemented);
pushRouter.post("/unsubscribe", notImplemented);
