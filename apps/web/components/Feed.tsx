"use client";

import { getCapability, type FeedItem } from "@ctp/catalog";
import { useState } from "react";
import { shortDate } from "@/lib/format";
import { t, TYPE_LABEL } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { ProviderBadge, StatusBadge } from "./Badges";

export function FeedRow({ item }: { item: FeedItem }) {
  const { lang } = usePrefs();
  const caps = item.capabilities.map((id) => getCapability(id)).filter((c) => !!c);
  const summary = item.summary?.[lang];
  return (
    <article className="flex flex-wrap gap-x-4.5 gap-y-2 border-b border-line px-4.5 py-4 last:border-b-0">
      <time dateTime={item.publishedAt} className="w-16 shrink-0 pt-0.5 font-mono text-[13px] text-muted">
        {shortDate(item.publishedAt, lang)}
      </time>
      <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-1.5">
        <div className="flex flex-wrap gap-1.5">
          <ProviderBadge provider={item.provider} lang={lang} />
          <span className="rounded bg-raised px-2 py-0.5 font-mono text-xs text-sub">{TYPE_LABEL[item.type][lang]}</span>
          {item.status && <StatusBadge status={item.status} lang={lang} />}
        </div>
        <a href={item.url} target="_blank" rel="noreferrer" className="text-[17px] font-medium leading-snug text-strong">
          {item.title}
        </a>
        {summary && <p className="text-sm leading-relaxed text-sub">{summary}</p>}
        <div className="text-sm text-muted">
          {item.sourceName}
          {caps.length > 0 && ` · ${caps.map((c) => c.name[lang]).join(" · ")}`}
        </div>
      </div>
    </article>
  );
}

export function FeedList({ items, pageSize = 25 }: { items: FeedItem[]; pageSize?: number }) {
  const { lang } = usePrefs();
  const [shown, setShown] = useState(pageSize);
  if (items.length === 0) {
    return <div className="rounded-lg bg-raised px-4.5 py-4 text-sub">{t("empty", lang)}</div>;
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {items.slice(0, shown).map((it) => (
          <FeedRow key={it.id} item={it} />
        ))}
      </div>
      {shown < items.length && (
        <button
          type="button"
          onClick={() => setShown((s) => s + pageSize)}
          className="min-h-11 self-start rounded-lg border border-control px-4 text-text"
        >
          {t("showMore", lang)} ({items.length - shown})
        </button>
      )}
    </div>
  );
}

export function FeedStatus({ status, message }: { status: "loading" | "error"; message?: string }) {
  const { lang } = usePrefs();
  return (
    <div role="status" className="rounded-lg bg-raised px-4.5 py-4 text-sub">
      {status === "loading" ? t("loading", lang) : `${t("feedError", lang)} ${message ?? ""}`}
    </div>
  );
}
