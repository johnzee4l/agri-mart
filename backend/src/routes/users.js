import { Router } from "express";
import { notImplemented } from "../middleware.js";

/* FR-16. Member 2 Phase 4 (Phase 3 if C5 is agreed): list users, change role,
   activate or deactivate. Admin only; deactivated users are rejected by auth. */
export const usersRouter = Router();

usersRouter.get("/", notImplemented);
usersRouter.patch("/:id", notImplemented);
