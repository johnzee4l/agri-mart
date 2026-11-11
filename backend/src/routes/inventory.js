import { Router } from "express";
import { notImplemented } from "../middleware.js";

/* FR-10, FR-11. Member 2 Phase 4 (Phase 3 if C5 is agreed): inventory log,
   low-stock list, adjust for stock-in, adjustment and spoilage. */
export const inventoryRouter = Router();

inventoryRouter.get("/logs", notImplemented);
inventoryRouter.get("/low-stock", notImplemented);
inventoryRouter.post("/adjust", notImplemented);
