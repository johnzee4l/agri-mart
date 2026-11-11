import { useEffect, useState } from "react";
import { Bell, BellSlash } from "@phosphor-icons/react";
import Button from "./ui/Button.jsx";
import { disablePush, enablePush, pushSupported, readSubscription } from "@/lib/push.js";
import { useOnline } from "@/lib/useOnline.js";

/* FR-21. Notification opt-in lives in Account (Phase 5 wiring). Every failure is
   spelled out, because a toggle that silently does nothing is worse than one that
   says why it cannot work yet. */
export default function NotificationToggle() {
  const online = useOnline();
  const supported = pushSupported();

  const [subscribed, setSubscribed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let active = true;

    readSubscription()
      .then((subscription) => {
        if (active) setSubscribed(Boolean(subscription));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function toggle() {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (subscribed) {
        await disablePush();
        setSubscribed(false);
        setNotice("Notifications are off for this device.");
      } else {
        await enablePush();
        setSubscribed(true);
        setNotice("Notifications are on for this device.");
      }
    } catch (failure) {
      setError(failure.message ?? "The notification setting could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-[60ch] flex-col gap-3">
      <h2 className="text-heading-sm text-fg">Push notifications</h2>
      <p className="text-body-md text-fg-muted">
        Order status updates and new announcements, delivered to this device.
      </p>

      {!supported ? (
        <p className="rounded-md bg-muted p-3 text-body-sm text-fg-muted">
          This browser does not support notifications. On iPhone, add AgriMart to the Home Screen
          first, then enable them here.
        </p>
      ) : null}

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

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={subscribed ? "secondary" : "primary"}
          loading={busy}
          disabled={!supported || !online || checking}
          onClick={toggle}
          className="self-start"
        >
          {subscribed ? (
            <>
              <BellSlash size={18} aria-hidden="true" />
              Turn off notifications
            </>
          ) : (
            <>
              <Bell size={18} aria-hidden="true" />
              Enable notifications
            </>
          )}
        </Button>

        {!online ? (
          <span className="text-caption text-fg-subtle">Reconnect to change this setting.</span>
        ) : null}
      </div>

      <p className="text-caption text-fg-subtle">
        Notifications need an HTTPS connection and the store&apos;s push configuration.
      </p>
    </div>
  );
}
