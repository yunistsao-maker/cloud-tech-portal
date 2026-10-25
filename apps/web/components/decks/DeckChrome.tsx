"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { DeckStop } from "@/lib/decks";
import { t, type StringKey } from "@/lib/i18n";
import { CLOUD_PREFS, usePrefs, type Lang } from "@/lib/prefs";

/** A UI string in the reader's language, for use inside server-rendered deck pages. */
export function Tr({ k }: { k: StringKey }) {
  const { lang } = usePrefs();
  return <>{t(k, lang)}</>;
}

const CLOUD_LABEL = { aws: "AWS", azure: "Azure", gcp: "GCP" } as const;

export interface TocEntry {
  kind: "cover" | "topic" | "appendix";
  href: string;
  num?: string;
  title?: string;
  current: boolean;
}

function tocLabel(e: TocEntry, lang: Lang) {
  if (e.kind === "cover") return { num: "00", title: t("overview", lang) };
  if (e.kind === "appendix") return { num: t("appendix", lang), title: e.title ?? "" };
  return { num: e.num ?? "", title: e.title ?? "" };
}

function TocMenu({ entries }: { entries: TocEntry[] }) {
  const { lang } = usePrefs();
  const ref = useRef<HTMLDetailsElement>(null);
  const path = usePathname();
  useEffect(() => {
    ref.current?.removeAttribute("open");
  }, [path]);
  useEffect(() => {
    const close = (e: Event) => {
      const d = ref.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !d.contains(e.target as Node)) d.removeAttribute("open");
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  return (
    <details ref={ref} className="toc-drop">
      <summary>{t("contents", lang)}</summary>
      <div className="toc-pop">
        <ol>
          {entries.map((e) => {
            const l = tocLabel(e, lang);
            return (
              <li key={e.href}>
                <Link href={e.href} aria-current={e.current ? "true" : undefined}>
                  <span>{l.num}</span>
                  {l.title}
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </details>
  );
}

function CloudSwitch() {
  const { lang, cloud, setCloud } = usePrefs();
  return (
    <div className="seg" role="group" aria-label={t("cloudPlatform", lang)}>
      {CLOUD_PREFS.map((c) => (
        <button key={c} type="button" data-c={c} aria-pressed={cloud === c} onClick={() => setCloud(c)}>
          {CLOUD_LABEL[c]}
        </button>
      ))}
    </div>
  );
}

export function DeckBar(props: {
  deckHref: string;
  deckTitle: string;
  /** "01 / 13", or null for the cover and appendix (the label is then derived from `kind`). */
  num: string | null;
  title: string | null;
  kind: "cover" | "topic" | "appendix";
  views?: { diagram: string; deep: string; current: "diagram" | "deep" };
  toc: TocEntry[];
}) {
  const { lang } = usePrefs();
  const ref = useRef<HTMLElement>(null);
  // Tell the CSS how far down the page the deck starts, so a diagram page fits the viewport
  // whatever height the portal header wraps to (or the ticker adds once the feed loads).
  useEffect(() => {
    const deck = ref.current?.closest<HTMLElement>(".deck");
    if (!deck) return;
    const measure = () => deck.style.setProperty("--d-top", `${Math.round(deck.getBoundingClientRect().top + window.scrollY)}px`);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);
  const { num, title } =
    props.kind === "cover"
      ? { num: "00", title: t("overview", lang) }
      : props.kind === "appendix"
        ? { num: t("appendix", lang), title: props.title }
        : props;
  return (
    <header ref={ref} className="bar">
      <div className="bar-in">
        <Link className="brand" href={props.deckHref}>
          <span className="mark" aria-hidden="true">
            <i style={{ background: "var(--d-z-ext)" }} />
            <i style={{ background: "var(--d-z-dmz)" }} />
            <i style={{ background: "var(--d-z-int)" }} />
            <i style={{ background: "var(--d-z-mgmt)" }} />
          </span>
          <b>{props.deckTitle}</b>
        </Link>
        <div className="crumb">
          <span className="num">{num}</span>
          <span className="ttl">{title}</span>
        </div>
        <div className="tools">
          {props.views && (
            <nav className="views" aria-label={t("view", lang)}>
              <Link href={props.views.diagram} aria-current={props.views.current === "diagram" ? "page" : undefined}>
                {t("diagram", lang)}
              </Link>
              <Link href={props.views.deep} aria-current={props.views.current === "deep" ? "page" : undefined}>
                {t("deepDive", lang)}
              </Link>
            </nav>
          )}
          <CloudSwitch />
          <TocMenu entries={props.toc} />
        </div>
      </div>
    </header>
  );
}

function stopLabel(s: DeckStop, lang: Lang) {
  switch (s.kind) {
    case "cover":
      return t("overview", lang);
    case "diagram":
      return `${s.num} ${s.short} · ${t("diagram", lang)}`;
    case "deep":
      return `${s.num} ${s.short} · ${t("deepDive", lang)}`;
    case "appendix":
      return `${t("appendix", lang)} · ${s.title}`;
  }
}

function isTyping(el: EventTarget | null) {
  return el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

/** Previous / next links; ← → keys and horizontal swipes (outside scrollable areas) turn pages. */
export function DeckPager({ prev, next }: { prev?: DeckStop; next?: DeckStop }) {
  const { lang } = usePrefs();
  const router = useRouter();
  const [touch, setTouch] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || isTyping(e.target)) return;
      if (e.key === "ArrowRight" && next) router.push(next.href);
      else if (e.key === "ArrowLeft" && prev) router.push(prev.href);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [prev, next, router]);

  useEffect(() => {
    const start = (e: TouchEvent) => {
      const el = e.target as Element | null;
      const p = e.touches[0];
      if (!p || e.touches.length !== 1 || el?.closest?.(".stage-scroll,.tablewrap,.toc-pop")) return setTouch(null);
      setTouch({ x: p.clientX, y: p.clientY });
    };
    document.addEventListener("touchstart", start, { passive: true });
    return () => document.removeEventListener("touchstart", start);
  }, []);

  useEffect(() => {
    if (!touch) return;
    const end = (e: TouchEvent) => {
      const p = e.changedTouches[0];
      if (!p) return;
      const dx = p.clientX - touch.x;
      const dy = p.clientY - touch.y;
      setTouch(null);
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) {
        const to = dx < 0 ? next : prev;
        if (to) router.push(to.href);
      }
    };
    document.addEventListener("touchend", end, { passive: true });
    return () => document.removeEventListener("touchend", end);
  }, [touch, prev, next, router]);

  return (
    <nav className="pager" aria-label={t("pageTurn", lang)}>
      <div className="pager-in">
        {prev ? (
          <Link className="pg prev" rel="prev" href={prev.href}>
            <small>{t("previous", lang)}</small>
            <span>{stopLabel(prev, lang)}</span>
          </Link>
        ) : (
          <span />
        )}
        <span className="pg-hint">{t("arrowHint", lang)}</span>
        {next ? (
          <Link className="pg next" rel="next" href={next.href}>
            <small>{t("next", lang)}</small>
            <span>{stopLabel(next, lang)}</span>
          </Link>
        ) : (
          <span />
        )}
      </div>
    </nav>
  );
}

/** Author, dates and the link to the original, under the cover title. */
export function DeckByline(props: { author: string; publishedAt: string; updatedAt?: string; sourceUrl: string; zhBody: boolean }) {
  const { lang } = usePrefs();
  return (
    <div className="meta">
      <span>{props.author}</span>
      <time dateTime={props.publishedAt}>{props.publishedAt}</time>
      {props.updatedAt && props.updatedAt !== props.publishedAt && (
        <span>
          {t("updated", lang)} <time dateTime={props.updatedAt}>{props.updatedAt}</time>
        </span>
      )}
      {props.zhBody && lang === "en" && <span>{t("deckInChinese", lang)}</span>}
      <a href={props.sourceUrl} target="_blank" rel="noreferrer">
        {t("openOriginalDeck", lang)} ↗
      </a>
    </div>
  );
}

/** Review checklist; ticks stay in this browser only. */
export function Checklist({ storageKey, items }: { storageKey: string; items: { zone: string; tag: string; text: string }[] }) {
  const { lang } = usePrefs();
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(storageKey) ?? "{}") ?? {});
    } catch {
      setDone({});
    }
  }, [storageKey]);

  const update = (next: Record<string, boolean>) => {
    setDone(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Blocked storage: ticks last for this page view.
    }
  };

  const count = items.filter((_, i) => done[`chk-${i + 1}`]).length;
  return (
    <>
      <div className="progress">
        <span>
          <b>{count}</b> / {items.length} {t("confirmed", lang)}
        </span>
        <span className="bar-meter" aria-hidden="true">
          <i style={{ width: `${Math.round((count / items.length) * 100)}%` }} />
        </span>
        <button type="button" className="btn" onClick={() => update({})}>
          {t("clearChecks", lang)}
        </button>
      </div>
      <div className="checks">
        {items.map((c, i) => {
          const id = `chk-${i + 1}`;
          return (
            <label key={id} className="chk">
              <input type="checkbox" id={id} checked={!!done[id]} onChange={(e) => update({ ...done, [id]: e.target.checked })} />
              <span>{c.text}</span>
              <em className={`z-${c.zone}`}>{c.tag}</em>
            </label>
          );
        })}
      </div>
    </>
  );
}
