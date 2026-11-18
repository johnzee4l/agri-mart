import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, m } from "motion/react";
import { Eye, EyeSlash, Plant, Star } from "@phosphor-icons/react";

import Button from "./Button.jsx";
import Input from "./Input.jsx";
import { cn } from "@/lib/cn.js";
import { duration, ease } from "@/styles/tokens/motion.js";

/* Split sign-in screen (21st.dev SignInPage pattern): a photographic testimonial
   panel on the left and the credentials form on the right. The storefront keeps its
   own token layer, so the template's colours, radii and type are expressed through
   semantic classes rather than raw values. */

const ROTATE_MS = 7000;

function PasswordField({ error }) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      label="Password"
      name="password"
      type={visible ? "text" : "password"}
      autoComplete="current-password"
      placeholder="Enter your password"
      error={error}
      required
      endAdornment={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="flex size-9 items-center justify-center rounded-full text-fg-muted transition-colors duration-[var(--duration-fast)] hover:bg-canvas hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {visible ? (
            <EyeSlash size={20} aria-hidden="true" />
          ) : (
            <Eye size={20} aria-hidden="true" />
          )}
        </button>
      }
    />
  );
}

function TestimonialPanel({ testimonials }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (testimonials.length < 2 || paused) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % testimonials.length);
    }, ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [paused, testimonials.length]);

  if (testimonials.length === 0) return null;

  const current = testimonials[active] ?? testimonials[0];

  return (
    <div
      aria-roledescription="carousel"
      aria-label="Customer testimonials"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <p className="mb-3 flex items-center gap-2 text-caption font-semibold tracking-[0.16em] text-on-inverse/70 uppercase">
        <Star size={14} weight="fill" className="text-highlight" aria-hidden="true" />
        What customers say
      </p>

      <div aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <m.figure
            key={`${current.name}-${current.handle}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: duration.fast, ease: ease.standard }}
            className="rounded-lg bg-tile-inverse/55 p-5 ring-1 ring-on-inverse/15 backdrop-blur-md"
          >
            <blockquote className="text-body-md text-on-inverse">“{current.text}”</blockquote>
            <figcaption className="mt-4 flex items-center gap-3">
              <img
                src={current.avatarSrc}
                alt=""
                width="40"
                height="40"
                loading="lazy"
                className="size-10 shrink-0 rounded-full object-cover ring-2 ring-on-inverse/20"
              />
              <span className="min-w-0">
                <span className="block truncate text-label font-semibold text-on-inverse">
                  {current.name}
                </span>
                <span className="block truncate text-caption text-on-inverse/70">
                  {current.handle}
                </span>
              </span>
            </figcaption>
          </m.figure>
        </AnimatePresence>
      </div>

      {testimonials.length > 1 ? (
        <div className="mt-3 flex items-center gap-1">
          {testimonials.map((testimonial, index) => (
            <button
              key={`${testimonial.name}-${testimonial.handle}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show testimonial from ${testimonial.name}`}
              aria-current={index === active ? "true" : undefined}
              className="group flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "h-2 rounded-full transition-[width,background-color] duration-[var(--duration-fast)]",
                  index === active
                    ? "w-6 bg-highlight"
                    : "w-2 bg-on-inverse/40 group-hover:bg-on-inverse/70",
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SignInPage({
  heroImageSrc,
  testimonials = [],
  onSignIn,
  onResetPassword,
  onCreateAccount,
  busy = false,
  error,
  notice,
  fieldErrors = {},
}) {
  return (
    <section className="mx-auto w-full max-w-[var(--container-wide)] px-4 py-8 lg:px-10 lg:py-12">
      <div className="grid overflow-hidden rounded-xl bg-surface shadow-float lg:min-h-[42rem] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <aside className="relative hidden overflow-hidden bg-tile-inverse lg:flex lg:flex-col lg:justify-between">
          {heroImageSrc ? (
            <img
              src={heroImageSrc}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-tile-inverse via-tile-inverse/55 to-tile-inverse/15"
          />

          <div className="relative flex flex-1 flex-col justify-between gap-12 p-10 xl:p-14">
            <Link
              to="/"
              className="inline-flex w-fit items-center gap-3 rounded-full bg-tile-inverse/35 py-1.5 pr-5 pl-1.5 text-on-inverse ring-1 ring-on-inverse/15 backdrop-blur-md"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-on-primary">
                <Plant size={20} weight="fill" aria-hidden="true" />
              </span>
              <span className="font-display text-heading-sm">AgriMart</span>
            </Link>

            <div className="max-w-md">
              <p className="text-caption font-semibold tracking-[0.16em] text-highlight uppercase">
                Your local farm store
              </p>
              <h2 className="mt-3 text-display-lg text-on-inverse">
                Everything your harvest needs.
              </h2>
              <p className="mt-4 text-body-md text-on-inverse/80">
                Seeds, feed, fertiliser and tools, ready for pickup or delivered from our
                store to your gate.
              </p>
            </div>

            <TestimonialPanel testimonials={testimonials} />
          </div>
        </aside>

        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20">
          <div className="mx-auto w-full max-w-[26rem]">
            <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
              <span className="flex size-9 items-center justify-center rounded-full bg-tint">
                <Plant size={20} weight="fill" className="text-primary-text" aria-hidden="true" />
              </span>
              <span className="font-display text-heading-sm text-fg">AgriMart</span>
            </Link>

            <p className="text-caption font-semibold tracking-[0.16em] text-primary-text uppercase">
              Account
            </p>
            <h1 className="mt-2 text-display-lg text-fg">Welcome back</h1>
            <p className="mt-3 text-body-md text-fg-muted">
              New to AgriMart?{" "}
              <button
                type="button"
                onClick={onCreateAccount}
                className="font-semibold text-primary-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                Create an account
              </button>
            </p>

            <form onSubmit={onSignIn} noValidate className="mt-8 flex flex-col gap-5">
              <Input
                label="Email address"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                error={fieldErrors.email}
                required
              />

              <PasswordField error={fieldErrors.password} />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onResetPassword}
                  className="text-body-sm font-semibold text-primary-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  Forgot password?
                </button>
              </div>

              {error ? (
                <p role="alert" className="rounded-md bg-danger-subtle p-3 text-body-sm text-danger-text">
                  {error}
                </p>
              ) : null}

              {notice ? (
                <p role="status" className="rounded-md bg-primary-subtle p-3 text-body-sm text-primary-text">
                  {notice}
                </p>
              ) : null}

              <Button type="submit" size="lg" loading={busy} className="w-full">
                Sign in
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SignInPage;
