import { ZodError } from "zod";
import { supabase } from "./lib/supabase.js";
import { ApiError } from "./lib/errors.js";
import { getProfile } from "./lib/profile.js";

/* Middleware (blueprint 6.5): auth, requireRole, zod validate, error handling. */

export { ApiError };

/** Standard placeholder for an endpoint whose phase has not landed. */
export function notImplemented(req, _res, next) {
  next(new ApiError(501, "Not implemented yet", [{ path: req.originalUrl }]));
}

/** Reads the Bearer token, verifies it with Supabase, loads the profile. */
export async function auth(req, _res, next) {
  try {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new ApiError(401, "Missing bearer token");

    const { data, error } = await supabase().auth.getUser(token);
    if (error || !data?.user) throw new ApiError(401, "Invalid or expired session");

    const profile = await getProfile(data.user.id);
    if (!profile.is_active) throw new ApiError(403, "Account is deactivated");

    // Kept for /auth/logout, which revokes this exact session.
    req.accessToken = token;
    req.user = { ...data.user, ...profile };
    next();
  } catch (error) {
    next(error);
  }
}

/** requireRole('admin') or requireRole('admin', 'staff'). Use after auth. */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, "Not signed in"));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have access to this resource"));
    }
    return next();
  };
}

/** Parses body/query/params with zod and exposes the result as req.validated. */
export function validate(schemas) {
  return (req, _res, next) => {
    try {
      const validated = {};
      for (const [key, schema] of Object.entries(schemas)) {
        validated[key] = schema.parse(req[key] ?? {});
      }
      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          new ApiError(
            400,
            "Validation failed",
            error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
          ),
        );
      }
      return next(error);
    }
  };
}

/** 404 for unmatched routes, in the standard error shape. */
export function notFound(req, res) {
  res.status(404).json({ error: "Not found", details: [{ path: req.originalUrl }] });
}

/** Central error handler. Shape: { error, details }. */
export function errorHandler(error, _req, res, _next) {
  // Errors thrown by our own code (ApiError) carry a deliberate status and message.
  const expected = typeof error.status === "number";
  const status = expected ? error.status : 500;

  // Log only unexpected failures and real server faults, not placeholders or 4xx.
  if (!expected || (status >= 500 && status !== 501)) console.error("[api]", error);

  res.status(status).json({
    error: expected ? error.message : "Internal server error",
    ...(error.details ? { details: error.details } : {}),
  });
}
