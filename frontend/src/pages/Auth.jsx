import PagePlaceholder from "../components/PagePlaceholder.jsx";

/* FR-14. One file, four modes (blueprint 4): login, signup, forgot, reset. */
const copy = {
  login: {
    title: "Log in",
    note: "Login form lands in Phase 2 against POST /auth/login. AuthProvider.login is already wired.",
  },
  signup: {
    title: "Create an account",
    note: "Signup lands in Phase 2 against POST /auth/register. The profile row is created by the database trigger.",
  },
  forgot: {
    title: "Reset your password",
    note: "Forgot-password lands in Phase 2 against POST /auth/forgot-password (Supabase reset email).",
  },
  reset: {
    title: "Set a new password",
    note: "The reset form reads the recovery token and calls POST /auth/reset-password in Phase 2.",
  },
};

export default function Auth({ mode = "login" }) {
  const { title, note } = copy[mode] ?? copy.login;

  return <PagePlaceholder eyebrow="Account" title={title} note={note} />;
}
