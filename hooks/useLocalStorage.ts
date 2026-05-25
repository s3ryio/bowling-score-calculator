"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Dispatch, SetStateAction } from "react";

const snapshotCache = new Map<string, { raw: string | null; value: unknown }>();

function readStoredValue<T>(key: string, initialValue: T): T {
  if (typeof window === "undefined") {
    return initialValue;
  }

  const raw = window.localStorage.getItem(key);
  const cached = snapshotCache.get(key);

  if (cached && cached.raw === raw) {
    return cached.value as T;
  }

  try {
    const value = raw ? (JSON.parse(raw) as T) : initialValue;
    snapshotCache.set(key, { raw, value });
    return value;
  } catch {
    snapshotCache.set(key, { raw: null, value: initialValue });
    return initialValue;
  }
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const localEvent = `local-storage:${key}`;

      window.addEventListener("storage", onStoreChange);
      window.addEventListener(localEvent, onStoreChange);

      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(localEvent, onStoreChange);
      };
    },
    [key],
  );

  const getSnapshot = useCallback(() => readStoredValue(key, initialValue), [initialValue, key]);
  const getServerSnapshot = useCallback(() => initialValue, [initialValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (action) => {
      const currentValue = readStoredValue(key, initialValue);
      const nextValue =
        typeof action === "function" ? (action as (previousValue: T) => T)(currentValue) : action;

      window.localStorage.setItem(key, JSON.stringify(nextValue));
      snapshotCache.set(key, { raw: JSON.stringify(nextValue), value: nextValue });
      window.dispatchEvent(new Event(`local-storage:${key}`));
    },
    [initialValue, key],
  );

  return [value, setValue, true];
}
