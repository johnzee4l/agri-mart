/* Vercel function entry point. vercel.json rewrites /api/* here and passes the original
   path as __path, because a catch-all filename matched only one segment on this
   deployment. The path is restored before Express runs, so its normal /api routes and
   the PayMongo webhook path are untouched.

   Socket.IO cannot live on a serverless function, so this imports app.js (no HTTP
   server, no socket). The storefront is built with VITE_REALTIME=off and uses REST
   plus polling for chat. */

let appPromise = null;

function loadApp() {
  if (!appPromise) {
    appPromise = import("../backend/src/app.js").then((module) => module.app);
  }
  return appPromise;
}

module.exports = async function handler(req, res) {
  const app = await loadApp();

  const url = new URL(req.url, "http://function.local");
  const captured = url.searchParams.get("__path");

  if (captured !== null) {
    url.searchParams.delete("__path");
    const query = url.searchParams.toString();
    req.url = `/api/${captured.replace(/^\/+/, "")}${query ? `?${query}` : ""}`;
  }

  return app(req, res);
};
