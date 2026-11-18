import { Router } from "express";
import { z } from "zod";

import { ApiError } from "../lib/errors.js";
import {
  conversationForCustomer,
  deliverMessage,
  ensureConversation,
  listConversations,
  listMessages,
  loadConversation,
} from "../lib/chatStore.js";
import { auth, requireRole, validate } from "../middleware.js";

/* FR-22. Staff inbox and thread history. Customers only ever read their own
   conversation; staff read any thread. The live send path is Socket.IO in
   src/chat.js, with this REST route as the fallback when the socket is unavailable. */

export const chatRouter = Router();

chatRouter.use(auth);

const messageQuery = z.object({
  conversation_id: z.uuid("That conversation id is not valid.").optional(),
  before: z.iso.datetime({ message: "Use an ISO timestamp for before." }).optional(),
  limit: z.coerce
    .number()
    .int("Use a whole number of messages.")
    .min(1, "Ask for at least one message.")
    .max(100, "Ask for at most 100 messages.")
    .optional(),
});

const messageBody = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a message first.")
    .max(2000, "Use at most 2000 characters."),
  conversation_id: z.uuid("That conversation id is not valid.").optional(),
});

chatRouter.get("/conversations", requireRole("admin", "staff"), async (_req, res) => {
  const rows = await listConversations();
  res.json({ data: rows, page: 1, total: rows.length });
});

chatRouter.get("/messages", validate({ query: messageQuery }), async (req, res) => {
  const { conversation_id: requested, before, limit } = req.validated.query;

  let conversation;

  if (req.user.role === "customer") {
    conversation = await conversationForCustomer(req.user.id);
    if (!conversation) {
      return res.json({ data: [], page: 1, total: 0, conversation: null });
    }
    // A customer may not use the endpoint to read another conversation.
    if (requested && requested !== conversation.id) {
      throw new ApiError(404, "Conversation not found");
    }
  } else {
    if (!requested) {
      throw new ApiError(400, "Validation failed", [
        { path: "conversation_id", message: "Choose a conversation." },
      ]);
    }
    conversation = await loadConversation(requested);
  }

  const messages = await listMessages({
    conversationId: conversation.id,
    before,
    limit,
  });

  return res.json({
    data: messages,
    page: 1,
    total: messages.length,
    conversation,
  });
});

chatRouter.post("/messages", validate({ body: messageBody }), async (req, res) => {
  const { body, conversation_id: requested } = req.validated.body;

  let conversation;

  if (req.user.role === "customer") {
    conversation = await conversationForCustomer(req.user.id);
    if (!conversation) conversation = await ensureConversation(req.user.id);
    if (requested && requested !== conversation.id) {
      throw new ApiError(404, "Conversation not found");
    }
  } else {
    if (!requested) {
      throw new ApiError(400, "Validation failed", [
        { path: "conversation_id", message: "Choose a conversation." },
      ]);
    }
    conversation = await loadConversation(requested);
  }

  const message = await deliverMessage({ sender: req.user, conversation, body });

  return res.status(201).json({
    data: message,
    conversation_id: conversation.id,
    customer_id: conversation.customer_id,
  });
});
