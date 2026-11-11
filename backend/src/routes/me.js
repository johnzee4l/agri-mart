import { Router } from "express";
import { notImplemented } from "../middleware.js";

/* FR-15. Member 2 Phase 1: own profile and saved addresses (DELETE = archive). */
export const meRouter = Router();

meRouter.get("/", notImplemented);
meRouter.patch("/", notImplemented);
meRouter.get("/addresses", notImplemented);
meRouter.post("/addresses", notImplemented);
meRouter.patch("/addresses/:id", notImplemented);
meRouter.delete("/addresses/:id", notImplemented);
