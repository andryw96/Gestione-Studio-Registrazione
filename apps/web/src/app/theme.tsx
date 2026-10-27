import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

interface ThemeCtx {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (m: ThemeMode) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);
const KEY = "studio.theme";

function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* storage non disponibile: si usa il tema di sistema */
  }
  return "system";
}

const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode);
  const [sysDark, setSysDark] = useState<boolean>(systemDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSysDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const resolved: ResolvedTheme = mode === "system" ? (sysDark ? "dark" : "light") : mode;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  const value = useMemo<ThemeCtx>(
    () => ({
      mode,
      resolved,
      setMode: (m) => {
        setModeState(m);
        try {
          localStorage.setItem(KEY, m);
        } catch {
          /* ignorato */
        }
      },
    }),
    [mode, resolved],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme fuori da ThemeProvider");
  return v;
}

/** Legge i token CSS correnti: usato da canvas e grafici. Si ricalcola al cambio tema. */
export function useThemeColors<K extends string>(names: readonly K[]): Record<K, string> {
  const { resolved } = useTheme();
  return useMemo(() => {
    const cs = getComputedStyle(document.documentElement);
    const out = {} as Record<K, string>;
    for (const n of names) out[n] = cs.getPropertyValue(`--${n}`).trim();
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);
}
