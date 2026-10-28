import { lazy, type ComponentType } from "react";

const KEY = "__savo_lazy_reload_at";

// Wraps React.lazy: if a page file is missing (the app was updated while
// this tab was open), reload once to fetch the latest version.
export function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      let last = 0;
      try { last = Number(sessionStorage.getItem(KEY) ?? "0"); } catch {}
      if (Date.now() - last > 10_000) {
        try { sessionStorage.setItem(KEY, String(Date.now())); } catch {}
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}
