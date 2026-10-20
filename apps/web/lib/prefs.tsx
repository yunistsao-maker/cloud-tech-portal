"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const SKIES = [
  { id: "white", label: { en: "White cloud", zh: "白雲" }, swatch: "#ffffff" },
  { id: "gray", label: { en: "Gray cloud", zh: "灰雲" }, swatch: "#c9ced6" },
  { id: "black", label: { en: "Storm cloud", zh: "烏雲" }, swatch: "#1a1d22" },
] as const;
export type Sky = (typeof SKIES)[number]["id"];
export type Lang = "en" | "zh";

interface Prefs {
  sky: Sky;
  lang: Lang;
  setSky: (s: Sky) => void;
  setLang: (l: Lang) => void;
}

const PrefsContext = createContext<Prefs | null>(null);
const KEY = "ctp.prefs";

function read(): Partial<Pick<Prefs, "sky" | "lang">> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** Runs before first paint (inlined in <head>) so a stored theme never flashes white. */
export const PREFS_BOOT_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("${KEY}")||"{}");if(p.sky)document.documentElement.dataset.sky=p.sky;if(p.lang==="zh")document.documentElement.lang="zh-Hant-TW"}catch(e){}`;

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [sky, setSkyState] = useState<Sky>("white");
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const p = read();
    if (p.sky && SKIES.some((s) => s.id === p.sky)) setSkyState(p.sky);
    if (p.lang === "zh" || p.lang === "en") setLangState(p.lang);
  }, []);

  const persist = useCallback((next: Partial<Pick<Prefs, "sky" | "lang">>) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...read(), ...next }));
    } catch {
      // Private mode or blocked storage: the choice lasts for this page view.
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.sky = sky;
  }, [sky]);
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-Hant-TW" : "en";
  }, [lang]);

  const value = useMemo<Prefs>(
    () => ({
      sky,
      lang,
      setSky: (s) => {
        setSkyState(s);
        persist({ sky: s });
      },
      setLang: (l) => {
        setLangState(l);
        persist({ lang: l });
      },
    }),
    [sky, lang, persist],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): Prefs {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs outside PrefsProvider");
  return ctx;
}
