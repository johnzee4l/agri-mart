import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import { useAuth } from "@/lib/auth.jsx";

/* FR-14. One file, four modes: login, signup, forgot, reset (blueprint 4). */
const copy = {
  login: { title: "Log in", submit: "Log in" },
  signup: { title: "Create an account", submit: "Create account" },
  forgot: { title: "Reset your password", submit: "Send reset link" },
  reset: { title: "Set a new password", submit: "Save new password" },
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY = { full_name: "", phone: "", email: "", password: "", confirm: "" };

function validate(mode, values, hasResetToken) {
  const errors = {};

  if (mode === "signup") {
    if (!values.full_name.trim()) errors.full_name = "Enter your full name.";
    if (values.phone.trim() && values.phone.trim().length < 7) {
      errors.phone = "Enter a valid phone number.";
    }
  }

  if (mode !== "reset") {
    if (!values.email.trim()) errors.email = "Enter your email address.";
    else if (!emailPattern.test(values.email.trim())) {
      errors.email = "Enter a valid email address.";
    }
  }

  if (mode !== "forgot") {
    if (!values.password) errors.password = "Enter a password.";
    else if (values.password.length < 8) errors.password = "Use at least 8 characters.";
  }

  if ((mode === "signup" || mode === "reset") && values.password !== values.confirm) {
    errors.confirm = "Passwords do not match.";
  }

  if (mode === "reset" && !hasResetToken) {
    errors.form = "This reset link is missing its token. Request a new one.";
  }

  return errors;
}

export default function Auth({ mode = "login" }) {
  const { login, register, forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const labels = copy[mode] ?? copy.login;

  // Supabase recovery links carry the token in the hash or as ?token.
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const resetToken = new URLSearchParams(location.search).get("token") ?? hash.get("access_token");

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const setField = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
  };

  async function handleSubmit(event) {
    event.preventDefault();

    const found = validate(mode, values, Boolean(resetToken));
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    setNotice(null);

    try {
      if (mode === "login") {
        await login(values.email.trim(), values.password);
        navigate(location.state?.from ?? "/", { replace: true });
      } else if (mode === "signup") {
        await register({
          email: values.email.trim(),
          password: values.password,
          full_name: values.full_name.trim(),
          phone: values.phone.trim() || null,
        });
        setNotice("Account created. Check your email to confirm it, then log in.");
        setValues(EMPTY);
      } else if (mode === "forgot") {
        await forgotPassword(values.email.trim());
        setNotice("If that address has an account, a reset link is on its way.");
      } else {
        await resetPassword({ token: resetToken, password: values.password });
        navigate("/login", { replace: true });
      }
    } catch (error) {
      setErrors({ form: error.message ?? "Something went wrong. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[var(--container-content)] px-4 py-16 lg:px-10 lg:py-24">
      <div className="flex max-w-[28rem] flex-col gap-6">
        <div>
          <p className="text-eyebrow font-bold text-primary-text uppercase">Account</p>
          <h1 className="mt-2 text-display-lg text-fg">{labels.title}</h1>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {mode === "signup" ? (
            <Input
              label="Full name"
              value={values.full_name}
              onChange={setField("full_name")}
              error={errors.full_name}
              autoComplete="name"
            />
          ) : null}

          {mode === "signup" ? (
            <Input
              label="Phone (optional)"
              type="tel"
              value={values.phone}
              onChange={setField("phone")}
              error={errors.phone}
              hint="Used for delivery updates."
              autoComplete="tel"
            />
          ) : null}

          {mode !== "reset" ? (
            <Input
              label="Email"
              type="email"
              value={values.email}
              onChange={setField("email")}
              error={errors.email}
              autoComplete="email"
            />
          ) : null}

          {mode !== "forgot" ? (
            <Input
              label="Password"
              type="password"
              value={values.password}
              onChange={setField("password")}
              error={errors.password}
              hint={mode === "reset" ? "At least 8 characters." : undefined}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          ) : null}

          {mode === "signup" || mode === "reset" ? (
            <Input
              label="Confirm password"
              type="password"
              value={values.confirm}
              onChange={setField("confirm")}
              error={errors.confirm}
              autoComplete="new-password"
            />
          ) : null}

          {errors.form ? (
            <p role="alert" className="rounded-md bg-danger-subtle p-3 text-body-sm text-danger-text">
              {errors.form}
            </p>
          ) : null}

          {notice ? (
            <p role="status" className="rounded-md bg-primary-subtle p-3 text-body-sm text-primary-text">
              {notice}
            </p>
          ) : null}

          <Button type="submit" size="lg" loading={busy}>
            {labels.submit}
          </Button>
        </form>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-body-sm">
          {mode === "login" ? (
            <>
              <Link to="/forgot" className="font-semibold text-primary-text hover:underline">
                Forgot password?
              </Link>
              <Link to="/signup" className="font-semibold text-primary-text hover:underline">
                Create an account
              </Link>
            </>
          ) : (
            <Link to="/login" className="font-semibold text-primary-text hover:underline">
              Back to log in
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
