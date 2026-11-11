import { Router } from "express";
import { notImplemented } from "../middleware.js";

/* FR-1, FR-2, FR-3, FR-23. Member 2 Phase 2: products and categories on top of
   lib/crud.js. Public queries always exclude archived rows. */
export const catalogRouter = Router();

catalogRouter.get("/products", notImplemented);
catalogRouter.get("/products/:id", notImplemented);
catalogRouter.post("/products", notImplemented);
catalogRouter.patch("/products/:id", notImplemented);
catalogRouter.delete("/products/:id", notImplemented);
catalogRouter.post("/products/:id/restore", notImplemented);
catalogRouter.delete("/products/:id/purge", notImplemented);

catalogRouter.get("/categories", notImplemented);
catalogRouter.post("/categories", notImplemented);
catalogRouter.patch("/categories/:id", notImplemented);
catalogRouter.delete("/categories/:id", notImplemented);
catalogRouter.post("/categories/:id/restore", notImplemented);
