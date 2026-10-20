"use client";

import { PROVIDER_LABEL, searchCatalog } from "@ctp/catalog";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";

export function compareHref(categoryId: string, capabilityId: string) {
  return `/compare/?cat=${encodeURIComponent(categoryId)}&cap=${encodeURIComponent(capabilityId)}`;
}

/** Type any service — current or retired name — and jump to its capability in Compare. */
export function SearchBox() {
  const { lang } = usePrefs();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const hits = useMemo(() => searchCatalog(q), [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (i: number) => {
    const hit = hits[i];
    if (!hit) return;
    setOpen(false);
    setQ("");
    router.push(compareHref(hit.capability.category, hit.capability.id));
  };

  return (
    <div className="relative min-w-0 flex-[1_1_280px]">
      <label className="flex items-center gap-2.5 rounded-lg border border-control bg-input px-3 py-2 text-muted">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <span className="sr-only">{t("search", lang)}</span>
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open && hits.length > 0}
          aria-controls={listId}
          aria-activedescendant={open && hits[active] ? `${listId}-${active}` : undefined}
          value={q}
          placeholder={t("searchPlaceholder", lang)}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, hits.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(active);
            } else if (e.key === "Escape") setOpen(false);
          }}
          className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-muted"
        />
        <kbd className="rounded border border-control px-1.5 py-0.5 font-mono text-xs">⌘K</kbd>
      </label>
      {open && hits.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
        >
          {hits.map((h, i) => (
            <li
              key={`${h.capability.id}-${h.matched}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                go(i);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2.5 ${i === active ? "bg-raised" : ""}`}
            >
              <div className="font-medium text-strong">
                {h.matched}
                {h.formerlyOf && (
                  <span className="ml-2 text-sm font-normal text-muted">
                    → {h.formerlyOf} ({t("formerly", lang)})
                  </span>
                )}
              </div>
              <div className="text-sm text-muted">
                {h.capability.name[lang]}
                {h.provider ? ` · ${PROVIDER_LABEL[h.provider]}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
