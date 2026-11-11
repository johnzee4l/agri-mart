import { Router } from "express";
import { notImplemented } from "../middleware.js";

/* FR-17. Member 2 Phase 2: read all site_content keys (public), update one (admin). */
export const contentRouter = Router();

contentRouter.get("/", notImplemented);
contentRouter.put("/:key", notImplemented);
