import { Router } from "express";
import { notImplemented } from "../middleware.js";

/* FR-6, FR-9. Member 2 Phase 3: PayMongo webhook. Raw body, signature verified
   with PAYMONGO_WEBHOOK_SECRET, idempotent, then deduct_stock. */
export const paymentsRouter = Router();

paymentsRouter.post("/webhook", notImplemented);
