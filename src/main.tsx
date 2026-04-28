import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Self-heal stale Vite dep cache: when a dynamic chunk fails to load
// (typically after a dev-server restart re-hashes /node_modules/.vite/deps),
// force a single hard reload so the browser fetches fresh chunk URLs.
const RELOAD_KEY = "__savo_chunk_reload_at";
const isChunkLoadError = (msg: unknown) => {
  const s = String(msg ?? "");
  return (
    s.includes("Importing a module script failed") ||
    s.includes("Failed to fetch dynamically imported module") ||
    s.includes("error loading dynamically imported module") ||
    /ChunkLoadError/i.test(s)
  );
};
const tryReload = () => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? "0");
    if (Date.now() - last < 10_000) return; // avoid reload loops
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {}
  // Bypass HTTP cache so Vite serves the new chunk hashes
  // @ts-expect-error - non-standard but supported in major browsers
  window.location.reload(true);
};
window.addEventListener("error", (e) => {
  if (isChunkLoadError(e?.message) || isChunkLoadError((e as any)?.error?.message)) {
    tryReload();
  }
});
window.addEventListener("unhandledrejection", (e) => {
  if (isChunkLoadError((e as any)?.reason?.message) || isChunkLoadError((e as any)?.reason)) {
    tryReload();
  }
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

