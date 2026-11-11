import { Router } from "express";
import { notImplemented } from "../middleware.js";

/* FR-22. Member 3 Phase 4: staff inbox and thread history. Customers can only
   read their own conversation. The socket handlers live in src/chat.js. */
export const chatRouter = Router();

chatRouter.get("/conversations", notImplemented);
chatRouter.get("/messages", notImplemented);
