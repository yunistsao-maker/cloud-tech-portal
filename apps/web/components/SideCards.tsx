"use client";

import { PROVIDERS, PROVIDER_LABEL, serviceLabel, type Capability, type FeedItem } from "@ctp/catalog";
import Link from "next/link";
import type { ReactNode } from "react";
import { upcoming } from "@/lib/events";
import { t } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { PROVIDER_TEXT } from "./Badges";
import { compareHref } from "./SearchBox";

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4.5">
      <h2 className="label-mono font-medium">{title}</h2>
      {children}
    </section>
  );
}

export function EquivalentsCard({ capability }: { capability: Capability }) {
  const { lang } = usePrefs();
  return (
    <Card title={`${t("equivalentServices", lang)} · ${capability.name[lang]}`}>
      <div className="flex flex-col gap-2">
        {PROVIDERS.map((p) => (
          <div key={p} className="flex justify-between gap-2.5 rounded-lg bg-raised px-3 py-2.5">
            <span className={`font-medium ${PROVIDER_TEXT[p]}`}>{PROVIDER_LABEL[p]}</span>
            <span className="text-right">{serviceLabel(capability, p)}</span>
          </div>
        ))}
      </div>
      <Link href={compareHref(capability.category, capability.id)} className="text-sm text-strong underline">
        {t("compare", lang)} →
      </Link>
    </Card>
  );
}

export function ItemListCard({ title, items }: { title: string; items: FeedItem[] }) {
  if (items.length === 0) return null;
  return (
    <Card title={title}>
      {items.map((i) => (
        <a key={i.id} href={i.url} target="_blank" rel="noreferrer" className="text-sm leading-snug">
          {i.title} <span className="text-muted">— {i.sourceName}</span>
        </a>
      ))}
    </Card>
  );
}

export function EventsCard() {
  const { lang } = usePrefs();
  const events = upcoming();
  if (events.length === 0) return null;
  return (
    <Card title={t("events", lang)}>
      {events.map((e) => (
        <div key={e.name} className="flex flex-col gap-1">
          <span className="font-medium">{e.name}</span>
          <span className="text-sm text-muted">
            {e.start} – {e.end} · {e.place}
          </span>
          {e.note && <span className="text-sm text-sub">{e.note[lang]}</span>}
        </div>
      ))}
    </Card>
  );
}
