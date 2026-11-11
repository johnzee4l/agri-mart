import { Router } from "express";
import { notImplemented } from "../middleware.js";

/* Member 2 Phase 2: multer upload to the Supabase Storage bucket public-images,
   returns the public URL. Admin only. */
export const uploadsRouter = Router();

uploadsRouter.post("/", notImplemented);
