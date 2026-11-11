import { Router } from "express";
import { z } from "zod";

import { ApiError } from "./errors.js";
import { supabase } from "./supabase.js";
import { auth, requireRole, validate } from "../middleware.js";

/* FR-23. One router factory for every soft-deleted resource (products, categories,
   announcements). Public reads exclude archived rows; writes are admin only; purge
   is admin only, archive-first, and may be blocked by the resource's own guard.

   Filter rules are declared up front so query values are validated before any
   database call, which keeps bad input a 400 even when Supabase is unreachable. */

const idParams = z.object({ id: z.uuid("That id is not valid.") });

function readPaging(query) {
  const page = Math.max(1, Math.floor(Number(query.page ?? 1)) || 1);
  const limit = Math.min(60, Math.max(1, Math.floor(Number(query.limit ?? 12)) || 12));
  return { page, limit };
}

/** Uses the token when one is sent, so admins can see drafts and archived rows.
    An expired token must not break public browsing, so 401 falls through as a
    guest; a deactivated account (403) still fails. */
function withAuth(req, res, next) {
  if (!req.headers.authorization) return next();

  return auth(req, res, (error) => {
    if (!error) return next();
    // Expired session or a half-created account: public reads still work as a guest.
    if (error.status === 401 || error.status === 404) return next();
    return next(error);
  });
}

function stripUndefined(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

export function patchOf(schema) {
  return schema
    .partial()
    .refine((body) => Object.keys(body).length > 0, {
      message: "Send at least one field to update.",
    });
}

export function crudRouter({
  table,
  select = "*",
  createSchema,
  updateSchema,
  searchColumns = [],
  filters = {},
  sortable = {},
  defaultSort = [{ column: "created_at", ascending: false }],
  publicQuery = null,
  onCreate = null,
  purgeGuard = null,
}) {
  const router = Router();

  router.get("/", withAuth, async (req, res) => {
    const { page, limit } = readPaging(req.query);
    const archived = String(req.query.archived ?? "") === "true";
    const isAdmin = req.user?.role === "admin";

    if (archived && !isAdmin) {
      throw new ApiError(403, "Only admins can list archived rows.");
    }

    // Resolve and validate everything that can fail before touching the database.
    const order = [];
    const sortKey = String(req.query.sort ?? "").trim();
    if (sortKey) {
      const chosen = sortable[sortKey];
      if (!chosen) {
        throw new ApiError(400, "Validation failed", [
          { path: "sort", message: `Use one of: ${Object.keys(sortable).join(", ")}` },
        ]);
      }
      order.push(chosen);
    } else {
      order.push(...defaultSort);
    }

    const applied = [];
    for (const [param, rule] of Object.entries(filters)) {
      const raw = req.query[param];
      if (raw === undefined || raw === "") continue;

      if (rule.numeric) {
        const value = Number(raw);
        if (!Number.isFinite(value)) {
          throw new ApiError(400, "Validation failed", [{ path: param, message: "Send a number." }]);
        }
        applied.push({ ...rule, value });
      } else {
        applied.push({ ...rule, value: String(raw) });
      }
    }

    let query = supabase().from(table).select(select, { count: "exact" });

    query = archived ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);
    if (!isAdmin && publicQuery) query = publicQuery(query, req);

    for (const rule of applied) {
      if (rule.op === "eq") query = query.eq(rule.column, rule.value);
      else if (rule.op === "ilike") query = query.ilike(rule.column, `%${rule.value}%`);
      else if (rule.op === "gte") query = query.gte(rule.column, rule.value);
      else if (rule.op === "lte") query = query.lte(rule.column, rule.value);
    }

    const term = String(req.query.q ?? "").trim().slice(0, 120);
    if (term && searchColumns.length > 0) {
      // Strip PostgREST separators so a search term cannot rewrite the filter.
      const safe = term.replace(/[(),.%]/g, " ").trim();
      if (safe) {
        query = query.or(searchColumns.map((column) => `${column}.ilike.%${safe}%`).join(","));
      }
    }

    order.forEach(({ column, ascending }) => {
      query = query.order(column, { ascending });
    });

    const { data, error, count } = await query.range((page - 1) * limit, page * limit - 1);
    if (error) throw new ApiError(500, `Could not load ${table}`);

    res.json({ data: data ?? [], page, total: count ?? 0 });
  });

  router.get("/:id", withAuth, validate({ params: idParams }), async (req, res) => {
    let query = supabase().from(table).select(select).eq("id", req.validated.params.id);
    if (req.user?.role !== "admin") query = query.is("deleted_at", null);

    const { data, error } = await query.maybeSingle();
    if (error) throw new ApiError(500, `Could not load that ${table.replace(/s$/, "")}`);
    if (!data) throw new ApiError(404, "Not found");

    res.json({ data });
  });

  router.post(
    "/",
    auth,
    requireRole("admin"),
    validate({ body: createSchema }),
    async (req, res) => {
      const payload = stripUndefined({
        ...(onCreate ? onCreate(req) : {}),
        ...req.validated.body,
      });

      const { data, error } = await supabase().from(table).insert(payload).select(select).single();
      if (error) throw new ApiError(400, error.message);

      res.status(201).json({ data });
    },
  );

  router.patch(
    "/:id",
    auth,
    requireRole("admin"),
    validate({ params: idParams, body: updateSchema }),
    async (req, res) => {
      const { data, error } = await supabase()
        .from(table)
        .update(stripUndefined(req.validated.body))
        .eq("id", req.validated.params.id)
        .select(select)
        .maybeSingle();

      if (error) throw new ApiError(400, error.message);
      if (!data) throw new ApiError(404, "Not found");

      res.json({ data });
    },
  );

  // Archive: soft delete through deleted_at (FR-23).
  router.delete(
    "/:id",
    auth,
    requireRole("admin"),
    validate({ params: idParams }),
    async (req, res) => {
      const { data, error } = await supabase()
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", req.validated.params.id)
        .select("id")
        .maybeSingle();

      if (error) throw new ApiError(500, "Could not archive that row");
      if (!data) throw new ApiError(404, "Not found");

      res.status(204).end();
    },
  );

  router.post(
    "/:id/restore",
    auth,
    requireRole("admin"),
    validate({ params: idParams }),
    async (req, res) => {
      const { data, error } = await supabase()
        .from(table)
        .update({ deleted_at: null })
        .eq("id", req.validated.params.id)
        .select(select)
        .maybeSingle();

      if (error) throw new ApiError(500, "Could not restore that row");
      if (!data) throw new ApiError(404, "Not found");

      res.json({ data });
    },
  );

  router.delete(
    "/:id/purge",
    auth,
    requireRole("admin"),
    validate({ params: idParams }),
    async (req, res) => {
      const { data: row, error } = await supabase()
        .from(table)
        .select("*")
        .eq("id", req.validated.params.id)
        .maybeSingle();

      if (error) throw new ApiError(500, "Could not load that row");
      if (!row) throw new ApiError(404, "Not found");
      if (!row.deleted_at) throw new ApiError(409, "Archive the row before purging it.");

      if (purgeGuard) await purgeGuard(row);

      const { error: deleteError } = await supabase().from(table).delete().eq("id", row.id);
      if (deleteError) throw new ApiError(500, "Could not purge that row");

      res.status(204).end();
    },
  );

  return router;
}
