"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { upcoming } from "@/lib/events";
import { t } from "@/lib/i18n";
import { useFeed } from "@/lib/items";
import { SKIES, usePrefs } from "@/lib/prefs";
import { SearchBox } from "./SearchBox";

function NavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-3 py-2 ${active ? "bg-raised font-medium text-strong" : "text-sub"}`}
    >
      {children}
    </Link>
  );
}

function Ticker() {
  const { lang } = usePrefs();
  const feed = useFeed();
  const next = upcoming()[0];
  const lifecycle =
    feed.status === "ready"
      ? feed.snapshot.items.filter((i) => i.status === "renamed" || i.status === "deprecated").slice(0, 1)
      : [];
  if (!next && lifecycle.length === 0) return null;
  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1440px] flex-wrap gap-x-7 gap-y-2 px-6 py-2.5 font-mono text-[13px] text-muted">
        {next && (
          <span>
            <span className="text-dot" aria-hidden="true">
              ●{" "}
            </span>
            {t("upcoming", lang).toUpperCase()} · {next.name} · {next.start} – {next.end} · {next.place}
          </span>
        )}
        {lifecycle.map((i) => (
          <a key={i.id} href={i.url} target="_blank" rel="noreferrer" className="max-w-[60ch] truncate">
            {(i.status === "renamed" ? "RENAMED" : "RETIRING").concat(" · ")}
            {i.title}
          </a>
        ))}
      </div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { lang, setLang, sky, setSky } = usePrefs();
  const path = usePathname() ?? "/";
  return (
    <div className="min-h-screen bg-bg text-text">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-surface focus:p-2">
        Skip to content
      </a>
      <header className="border-b border-border bg-header">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-7 gap-y-4 px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 font-mono text-base font-medium hover:no-underline">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M3 12h4l3-8 4 16 3-8h4" />
            </svg>
            <span>
              cloud<span className="text-dot">/</span>pulse
            </span>
          </Link>
          <nav aria-label="Primary" className="flex flex-wrap gap-1">
            <NavLink href="/" active={path === "/"}>
              {t("pulse", lang)}
            </NavLink>
            <NavLink href="/compare/" active={path.startsWith("/compare")}>
              {t("compare", lang)}
            </NavLink>
            <NavLink href="/category/ai-ml/" active={path.startsWith("/category")}>
              {t("categories", lang)}
            </NavLink>
            <NavLink href="/reports/" active={path.startsWith("/reports")}>
              {t("reports", lang)}
            </NavLink>
          </nav>
          <SearchBox />
          <div role="group" aria-label={t("language", lang)} className="flex overflow-hidden rounded-lg border border-control">
            {(["en", "zh"] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
                className={`min-h-9 px-3 text-[13px] ${lang === l ? "bg-raised text-strong" : "text-muted"}`}
              >
                {l === "en" ? "EN" : "繁中"}
              </button>
            ))}
          </div>
          <div role="group" aria-label={t("skyColour", lang)} className="flex items-center gap-1.5">
            {SKIES.map((s) => (
              <button
                key={s.id}
                type="button"
                title={s.label[lang]}
                aria-label={s.label[lang]}
                aria-pressed={sky === s.id}
                onClick={() => setSky(s.id)}
                style={{ background: s.swatch }}
                className={`size-9 rounded-full border-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)] ${sky === s.id ? "border-text" : "border-transparent"}`}
              />
            ))}
          </div>
        </div>
      </header>
      <Ticker />
      <div id="main" className="mx-auto max-w-[1440px] px-6 py-6">
        {children}
      </div>
    </div>
  );
}
