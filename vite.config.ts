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
      },
      manifest: {
        name: "Savo — Vehicle Claims Made Simple",
        short_name: "Savo",
        description: "Report vehicle incidents, track claims, and get sorted.",
        theme_color: "#e8650a",
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
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['framer-motion', 'recharts'],
          'vendor-i18n': ['i18next', 'react-i18next'],
        },
      },
    },
  },
}));
