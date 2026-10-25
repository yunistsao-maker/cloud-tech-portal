"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const SKIES = [
  { id: "white", label: { en: "White cloud", zh: "白雲" }, swatch: "#ffffff" },
  { id: "gray", label: { en: "Gray cloud", zh: "灰雲" }, swatch: "#c9ced6" },
  { id: "black", label: { en: "Storm cloud", zh: "烏雲" }, swatch: "#1a1d22" },
] as const;
export type Sky = (typeof SKIES)[number]["id"];
export type Lang = "en" | "zh";
/** Cloud shown where a page has one variant per provider (diagram decks). */
export const CLOUD_PREFS = ["aws", "azure", "gcp"] as const;
export type CloudPref = (typeof CLOUD_PREFS)[number];

interface Prefs {
  sky: Sky;
  lang: Lang;
  cloud: CloudPref;
  setSky: (s: Sky) => void;
  setLang: (l: Lang) => void;
  setCloud: (c: CloudPref) => void;
}

type Stored = Partial<Pick<Prefs, "sky" | "lang" | "cloud">>;

const PrefsContext = createContext<Prefs | null>(null);
const KEY = "ctp.prefs";

function read(): Stored {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** Runs before first paint (inlined in <head>) so a stored theme or cloud never flashes the default. */
export const PREFS_BOOT_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("${KEY}")||"{}"),d=document.documentElement;if(p.sky)d.dataset.sky=p.sky;if(p.lang==="zh")d.lang="zh-Hant-TW";if(${JSON.stringify(CLOUD_PREFS)}.indexOf(p.cloud)>=0)d.dataset.cloud=p.cloud}catch(e){}`;

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [sky, setSkyState] = useState<Sky>("white");
  const [lang, setLangState] = useState<Lang>("en");
  const [cloud, setCloudState] = useState<CloudPref>("aws");
  // Until stored prefs are read, leave the <html> attributes the boot script set.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const p = read();
    if (p.sky && SKIES.some((s) => s.id === p.sky)) setSkyState(p.sky);
    if (p.lang === "zh" || p.lang === "en") setLangState(p.lang);
    if (p.cloud && CLOUD_PREFS.includes(p.cloud)) setCloudState(p.cloud);
    setLoaded(true);
  }, []);

  const persist = useCallback((next: Stored) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...read(), ...next }));
    } catch {
      // Private mode or blocked storage: the choice lasts for this page view.
    }
  }, []);

  useEffect(() => {
    if (loaded) document.documentElement.dataset.sky = sky;
  }, [sky, loaded]);
  useEffect(() => {
    if (loaded) document.documentElement.lang = lang === "zh" ? "zh-Hant-TW" : "en";
  }, [lang, loaded]);
  useEffect(() => {
    if (loaded) document.documentElement.dataset.cloud = cloud;
  }, [cloud, loaded]);

  const value = useMemo<Prefs>(
    () => ({
      sky,
      lang,
      cloud,
      setSky: (s) => {
        setSkyState(s);
        persist({ sky: s });
      },
      setLang: (l) => {
        setLangState(l);
        persist({ lang: l });
      },
      setCloud: (c) => {
        setCloudState(c);
        persist({ cloud: c });
      },
    }),
    [sky, lang, cloud, persist],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): Prefs {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs outside PrefsProvider");
  return ctx;
}
