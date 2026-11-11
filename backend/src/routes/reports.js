import { Router } from "express";
import { notImplemented } from "../middleware.js";

/* FR-18. Member 2 Phase 4: summary (staff and admin), sales, inventory,
   low-stock and top-products (admin), CSV via ?format=csv. */
export const reportsRouter = Router();

reportsRouter.get("/summary", notImplemented);
reportsRouter.get("/:type", notImplemented);
