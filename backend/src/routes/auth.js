import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import { ApiError } from "../lib/errors.js";
import { authClient, supabase } from "../lib/supabase.js";
import { getProfile } from "../lib/profile.js";
import { auth, validate } from "../middleware.js";

/* FR-14. Supabase Auth behind Node endpoints (blueprint 6.5): the browser never
   holds a Supabase key. Login is rate limited per IP; a wrong password and an
   unknown email give the same answer. */

export const authRouter = Router();

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

const passwordField = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.");

const fullNameField = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(120, "Use at most 120 characters.");

const phoneField = z
  .string()
  .trim()
  .max(20, "Use at most 20 characters.")
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

/* Five attempts a minute per IP: enough for a typo, not enough to guess. */
const loginLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Try again in a minute." },
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many reset requests. Try again later." },
});

function frontendOrigin() {
  return (process.env.FRONTEND_URL ?? "http://localhost:5173").split(",")[0].trim();
}

authRouter.post(
  "/register",
  validate({
    body: z.object({
      email: emailField,
      password: passwordField,
      full_name: fullNameField,
      phone: phoneField,
    }),
  }),
  async (req, res) => {
    const { email, password, full_name, phone } = req.validated.body;

    // Full name and phone travel as metadata; the database trigger copies them
    // into profiles (blueprint 5.3, D1).
    const { data, error } = await supabase().auth.signUp({
      email,
      password,
      options: { data: { full_name, phone } },
    });

    if (error) {
      if (/already registered|already exists/i.test(error.message)) {
        throw new ApiError(409, "An account with this email already exists.");
      }
      throw new ApiError(400, error.message);
    }

    // Supabase returns a user with no identities when the email is taken.
    if (!data.user) throw new ApiError(400, "The account could not be created.");
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new ApiError(409, "An account with this email already exists.");
    }

    // No session means the project requires email confirmation first.
    res.status(201).json({
      data: { id: data.user.id, email: data.user.email },
      message: data.session
        ? "Account created. Sign in with your email and password."
        : "Account created. Check your email to confirm it, then sign in.",
    });
  },
);

authRouter.post(
  "/login",
  loginLimiter,
  validate({
    body: z.object({
      email: emailField,
      password: z.string().min(1, "Enter your password."),
    }),
  }),
  async (req, res) => {
    const { email, password } = req.validated.body;

    const { data, error } = await authClient().auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new ApiError(401, "Email or password is incorrect.");

    const profile = await getProfile(data.user.id);
    if (!profile.is_active) {
      throw new ApiError(403, "This account is deactivated. Contact the store.");
    }

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      profile: { ...profile, email: data.user.email },
    });
  },
);

authRouter.post(
  "/refresh",
  validate({
    body: z.object({ refresh_token: z.string().min(10, "Send the refresh token.") }),
  }),
  async (req, res) => {
    const { data, error } = await authClient().auth.refreshSession({
      refresh_token: req.validated.body.refresh_token,
    });

    if (error || !data.session) throw new ApiError(401, "That session has expired. Sign in again.");

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    });
  },
);

authRouter.post("/logout", auth, async (req, res) => {
  // Revoke every session for the account, not just this token.
  const { error } = await supabase().auth.admin.signOut(req.accessToken, "global");
  if (error) throw new ApiError(500, "Could not end the session");

  res.status(204).end();
});

authRouter.post(
  "/forgot-password",
  forgotLimiter,
  validate({ body: z.object({ email: emailField }) }),
  async (req, res) => {
    // The answer never reveals whether the address has an account.
    const { error } = await supabase()
      .auth.resetPasswordForEmail(req.validated.body.email, { redirectTo: `${frontendOrigin()}/reset` })
      .catch(() => ({ error: null }));

    if (error) console.error("[auth] reset email failed:", error.message);

    res.status(202).json({ message: "If that email has an account, a reset link is on its way." });
  },
);

authRouter.post(
  "/reset-password",
  validate({
    body: z.object({
      access_token: z.string().min(10, "Send the recovery token."),
      password: passwordField,
    }),
  }),
  async (req, res) => {
    const { access_token, password } = req.validated.body;

    const { data, error } = await supabase().auth.getUser(access_token);
    if (error || !data?.user) throw new ApiError(401, "That reset link is invalid or has expired.");

    const { error: updateError } = await supabase()
      .auth.admin.updateUserById(data.user.id, { password });
    if (updateError) throw new ApiError(400, updateError.message);

    res.json({ message: "Password updated. Sign in with the new password." });
  },
);
