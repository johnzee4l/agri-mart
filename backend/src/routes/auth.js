import { Router } from "express";
import { notImplemented } from "../middleware.js";

/* FR-14. Member 2 Phase 1: register, login (strict rate limit), refresh, logout,
   forgot-password, reset-password. Contract: docs/api.md. */
export const authRouter = Router();

authRouter.post("/register", notImplemented);
authRouter.post("/login", notImplemented);
authRouter.post("/refresh", notImplemented);
authRouter.post("/logout", notImplemented);
authRouter.post("/forgot-password", notImplemented);
authRouter.post("/reset-password", notImplemented);
