/* The chat panel is lazily mounted (and only for signed-in customers), so a click that
   arrives before its listener exists would otherwise do nothing. A request made with no
   listener is remembered and delivered the moment one subscribes. */

let pending = false;
const listeners = new Set();

export function requestChat() {
  if (listeners.size === 0) {
    pending = true;
    return;
  }

  for (const listener of listeners) listener();
}

export function onChatRequest(handler) {
  listeners.add(handler);

  if (pending) {
    pending = false;
    handler();
  }

  return () => {
    listeners.delete(handler);
  };
}
