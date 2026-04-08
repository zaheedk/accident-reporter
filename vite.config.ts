import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["app-icon.png", "placeholder.svg"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2}"],
        navigateFallbackDenylist: [/^\/~oauth/],
        importScripts: ['/sw-push.js'],
      },
      manifest: {
        name: "Savo — Vehicle Claims Made Simple",
        short_name: "Savo",
        description: "Report vehicle incidents, track claims, and get sorted.",
        theme_color: "#1e3a5f",
        background_color: "#f3f4f8",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/app-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/app-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/app-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router-dom/")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/@supabase/supabase-js/")) {
            return "vendor-supabase";
          }
          if (id.includes("node_modules/framer-motion/") || id.includes("node_modules/recharts/")) {
            return "vendor-ui";
          }
          if (id.includes("node_modules/i18next/") || id.includes("node_modules/react-i18next/")) {
            return "vendor-i18n";
          }
        },
      },
    },
  },
}));
