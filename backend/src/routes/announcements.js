import { Router } from "express";
import { notImplemented } from "../middleware.js";

/* FR-12, FR-13. Member 2 Phase 2: published announcements (pinned first) plus
   admin draft/publish through published_at. */
export const announcementsRouter = Router();

announcementsRouter.get("/", notImplemented);
announcementsRouter.post("/", notImplemented);
announcementsRouter.patch("/:id", notImplemented);
announcementsRouter.delete("/:id", notImplemented);
announcementsRouter.post("/:id/restore", notImplemented);
announcementsRouter.delete("/:id/purge", notImplemented);
