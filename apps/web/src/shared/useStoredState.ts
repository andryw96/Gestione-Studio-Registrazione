import { useEffect, useState } from "react";

/** useState persistito in localStorage. Ogni accesso è protetto: lo storage può non essere disponibile. */
export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      /* ignorato */
    }
    return initial;
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignorato */
    }
  }, [key, value]);
  return [value, setValue] as const;
}
