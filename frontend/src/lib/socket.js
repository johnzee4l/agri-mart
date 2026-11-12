import { API_BASE_URL, getToken } from "./api.js";

/* FR-22, D6. One socket per tab, shared by live stock and (later) chat.
   The handshake carries the access token (blueprint 6.3). Guests do not connect,
   because the socket handshake requires a token.

   socket.io-client is imported on demand: it is only needed by signed-in sessions, and
   a static import pushed the entry chunk past the 500 kB warning threshold. */

function origin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL;
  }
}

let client = null;
let loading = null;

function getClient() {
  if (client) return Promise.resolve(client);

  if (!loading) {
    loading = import("socket.io-client").then(({ io }) => {
      client = io(origin(), { autoConnect: false });
      return client;
    });
  }

  return loading;
}

export function disconnectSocket() {
  client?.disconnect();
}

/** The shared client with this tab's token applied and connected, for a caller that also
    sends (chat) rather than only listening. Rejects when nobody is signed in. */
export function connectSocket() {
  const token = getToken();
  if (!token) return Promise.reject(new Error("Not signed in"));

  return getClient().then((socket) => {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  });
}

/** Subscribes to `stock { product_id, stock_qty }`. Returns an unsubscribe function. */
export function onStock(handler) {
  const token = getToken();
  if (!token) return () => {};

  let active = true;
  let instance = null;
  let listener = null;

  getClient()
    .then((socket) => {
      if (!active) return;

      instance = socket;
      socket.auth = { token };
      if (!socket.connected) socket.connect();

      listener = (payload) => {
        if (active) handler(payload);
      };
      socket.on("stock", listener);
    })
    .catch(() => {
      // Live stock is an enhancement; a failed client load must not break the page.
    });

  return () => {
    active = false;
    if (instance && listener) instance.off("stock", listener);
  };
}
