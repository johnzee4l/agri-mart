import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    /* FR-20. injectManifest keeps the caching policy in src/sw.js, which also carries
       the push handlers. Colours and the maskable icon follow designtokens 15. */
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "AgriMart",
        short_name: "AgriMart",
        description: "Farm supplies, seeds, feeds and tools from the local store.",
        lang: "en-PH",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "portrait",
        theme_color: "#2D6F47",
        background_color: "#FAF8F3",
        categories: ["shopping", "business", "productivity"],
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "/maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Shop products",
            short_name: "Shop",
            description: "Browse seeds, feeds, tools and irrigation supplies.",
            url: "/products",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Your cart",
            short_name: "Cart",
            description: "Review the items in your cart.",
            url: "/cart",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Your account",
            short_name: "Account",
            description: "Orders, addresses and notifications.",
            url: "/account",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
      },
      injectManifest: {
        // Fonts are self-hosted (designtokens D10) and must be precached too.
        globPatterns: ["**/*.{js,css,html,woff2,woff,svg,png,jpg,jpeg,webp,ico}"],
      },
      /* Enabled in dev so the app is actually installable while developing: Chrome only
         fires `beforeinstallprompt` when a service worker controls the page, and the
         settings install button depends on that event. */
      devOptions: { enabled: true, type: "module" },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});
