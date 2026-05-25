"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

const THEME_STORAGE_KEY = "bowling-score-calculator-theme";
const THEME_CHANGE_EVENT = "bowling-theme-changed";
const MEDIA_QUERY = "(prefers-color-scheme: light)";

function readStoredPreference(): ThemePreference {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "dark" || raw === "light" || raw === "system") {
      return raw;
    }
  } catch {
    return "system";
  }

  return "system";
}

function subscribePreference(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

function subscribeMedia(onChange: () => void) {
  if (typeof window.matchMedia !== "function") {
    return () => {};
  }

  const media = window.matchMedia(MEDIA_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function readSystemTheme(): ResolvedTheme {
  if (typeof window.matchMedia !== "function") {
    return "dark";
  }
  return window.matchMedia(MEDIA_QUERY).matches ? "light" : "dark";
}

function getServerPreference(): ThemePreference {
  return "system";
}

function getServerSystemTheme(): ResolvedTheme {
  return "dark";
}

function applyTheme(theme: ResolvedTheme) {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

export function useTheme() {
  const preference = useSyncExternalStore(
    subscribePreference,
    readStoredPreference,
    getServerPreference,
  );

  const systemTheme = useSyncExternalStore(
    subscribeMedia,
    readSystemTheme,
    getServerSystemTheme,
  );

  const resolvedTheme: ResolvedTheme = preference === "system" ? systemTheme : preference;

  // Aplicar el tema al DOM cada vez que cambia el resuelto.
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignorar errores de storage (modo privado, etc.)
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const toggleTheme = useCallback(() => {
    const next: ThemePreference = resolvedTheme === "dark" ? "light" : "dark";
    setPreference(next);
  }, [resolvedTheme, setPreference]);

  return { preference, resolvedTheme, ready: true, setPreference, toggleTheme };
}
