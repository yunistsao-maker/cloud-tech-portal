"use client";

import { capabilitiesIn, getCategory, PROVIDERS, PROVIDER_LABEL, serviceLabel, type ContentType } from "@ctp/catalog";
import Link from "next/link";
import { useMemo, useState } from "react";
import { t, TYPE_LABEL } from "@/lib/i18n";
import { filterItems, recentlyChanged, useFeed } from "@/lib/items";
import { usePrefs } from "@/lib/prefs";
import { PROVIDER_TEXT } from "./Badges";
import { FeedList, FeedStatus } from "./Feed";
import { compareHref } from "./SearchBox";
import { EventsCard, ItemListCard } from "./SideCards";

const TABS: (ContentType | "all")[] = ["all", "announcement", "blog", "research", "lifecycle"];

export function CategoryHub({ id }: { id: string }) {
  const { lang } = usePrefs();
  const feed = useFeed();
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const cat = getCategory(id)!;
  const caps = capabilitiesIn(id);
  const all = feed.status === "ready" ? feed.snapshot.items : [];
  const inCat = useMemo(() => filterItems(all, { category: id }), [all, id]);
  // "Everything" leaves papers to the Research tab so announcements stay on top.
  const shownItems = tab === "all" ? inCat.filter((i) => i.type !== "research") : inCat.filter((i) => i.type === tab);
  const changed = useMemo(() => recentlyChanged(inCat), [inCat]);
  const lifecycle = inCat.filter((i) => i.status === "renamed" || i.status === "deprecated").slice(0, 5);
  const research = inCat.filter((i) => i.type === "research").slice(0, 4);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <nav aria-label="Breadcrumb" className="font-mono text-[13px] text-muted">
          <Link href="/">{t("pulse", lang)}</Link> / {t("categories", lang)} / <span className="text-strong">{cat.name[lang]}</span>
        </nav>
        <h1 className="text-4xl font-semibold tracking-tight">
          {cat.name.en} <span className="text-2xl font-normal text-muted">{cat.name.zh}</span>
        </h1>
      </div>

      <section aria-labelledby="caps-h" className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="caps-h" className="text-xl font-semibold">
            {t("capabilities", lang)}
          </h2>
          <Link href={compareHref(id, caps[0]!.id)} className="font-mono text-[13px] text-strong underline">
            {t("openMatrix", lang)} →
          </Link>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
          {caps.map((c) => (
            <Link
              key={c.id}
              href={compareHref(id, c.id)}
              className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4.5 hover:no-underline"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-base font-semibold text-strong">{c.name[lang]}</span>
                  <span className="text-[13px] text-muted">{c.name[lang === "en" ? "zh" : "en"]}</span>
                </div>
                {changed.has(c.id) && (
                  <span className="shrink-0 rounded-full bg-warn-bg px-2 py-0.5 font-mono text-xs text-warn">
                    {lang === "zh" ? "有更新" : "updated"}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1.5 text-sm">
                {PROVIDERS.map((p) => (
                  <div key={p} className="flex gap-2.5">
                    <span className={`w-14 shrink-0 font-medium ${PROVIDER_TEXT[p]}`}>{p === "gcp" ? "GCP" : PROVIDER_LABEL[p]}</span>
                    <span className="text-text">{serviceLabel(c, p)}</span>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-label="Latest" className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5">
          <div role="tablist" aria-label={t("type", lang)} className="flex flex-wrap gap-1 border-b border-border">
            {TABS.map((tb) => (
              <button
                key={tb}
                type="button"
                role="tab"
                aria-selected={tab === tb}
                onClick={() => setTab(tb)}
                className={`min-h-11 px-3.5 ${tab === tb ? "font-semibold text-strong shadow-[inset_0_-2px_0_var(--accent)]" : "text-muted"}`}
              >
                {tb === "all" ? t("everything", lang) : TYPE_LABEL[tb][lang]}
              </button>
            ))}
          </div>
          {feed.status === "ready" ? (
            <FeedList items={shownItems} />
          ) : (
            <FeedStatus status={feed.status} message={feed.status === "error" ? feed.message : undefined} />
          )}
        </section>
        <aside aria-label="Context" className="flex max-w-[400px] flex-[1_1_320px] flex-col gap-4">
          <ItemListCard title={t("lifecycle", lang)} items={lifecycle} />
          <ItemListCard title={t("research", lang)} items={research} />
          <EventsCard />
        </aside>
      </div>
    </div>
  );
}
