import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";

import { ApiError } from "../lib/errors.js";
import { supabase } from "../lib/supabase.js";
import { auth, requireRole } from "../middleware.js";

/* Member 2 Phase 2. One image per request, held in memory, then written to the
   public-images bucket. Admin only, because it writes to shared storage. */

export const uploadsRouter = Router();

const BUCKET = "public-images";
const MAX_BYTES = 5 * 1024 * 1024;

const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter(_req, file, callback) {
    if (!EXTENSIONS[file.mimetype]) {
      return callback(new ApiError(400, "Upload a JPEG, PNG, WebP, GIF or AVIF image."));
    }
    return callback(null, true);
  },
});

/* Turns multer's own errors into the standard shape instead of a bare 500. */
function singleImage(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Images must be 5 MB or smaller."
          : "The upload could not be read.";
      return next(new ApiError(400, message));
    }

    return next(error.status ? error : new ApiError(400, "The upload could not be read."));
  });
}

uploadsRouter.post("/", auth, requireRole("admin"), singleImage, async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Attach one image in the "file" field.');

  const path = `products/${Date.now()}-${randomUUID()}.${EXTENSIONS[req.file.mimetype]}`;
  const storage = supabase().storage.from(BUCKET);

  const { error } = await storage.upload(path, req.file.buffer, {
    contentType: req.file.mimetype,
    upsert: false,
  });

  if (error) {
    throw new ApiError(502, "The image could not be stored. Check the public-images bucket.");
  }

  const { data } = storage.getPublicUrl(path);

  res.status(201).json({ data: { url: data.publicUrl, path } });
});
