"use client";

import { CONTENT_TYPES, getCapability, PROVIDERS, type ContentType, type FeedItem } from "@ctp/catalog";
import { useMemo, useState } from "react";
import { dateTime } from "@/lib/format";
import { t, TYPE_LABEL } from "@/lib/i18n";
import { filterItems, useFeed } from "@/lib/items";
import { usePrefs } from "@/lib/prefs";
import { CategoryRail } from "./CategoryRail";
import { FeedList, FeedStatus } from "./Feed";
import { ProviderFilter, toggle } from "./ProviderFilter";
import { EquivalentsCard, EventsCard, ItemListCard } from "./SideCards";

const RANGES = [
  { id: "1", days: 1, label: "24h" },
  { id: "7", days: 7, label: "7d" },
  { id: "30", days: 30, label: "30d" },
  { id: "all", days: undefined, label: "All" },
] as const;

function topCapability(items: FeedItem[]) {
  const counts = new Map<string, number>();
  for (const i of items) for (const c of i.capabilities.slice(0, 1)) counts.set(c, (counts.get(c) ?? 0) + 1);
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return best ? getCapability(best) : undefined;
}

export function PulsePage({ category }: { category?: string }) {
  const { lang } = usePrefs();
  const feed = useFeed();
  const [providers, setProviders] = useState(new Set<FeedItem["provider"]>([...PROVIDERS, "independent"]));
  const [types, setTypes] = useState(new Set<ContentType>());
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("all");

  const all = feed.status === "ready" ? feed.snapshot.items : [];
  const items = useMemo(
    () =>
      filterItems(all, {
        category,
        providers,
        // Papers arrive in daily batches and would bury announcements; they get the side card unless asked for.
        types: types.size ? types : new Set(CONTENT_TYPES.filter((c) => c !== "research")),
        sinceDays: RANGES.find((r) => r.id === range)?.days,
      }),
    [all, category, providers, types, range],
  );
  const focus = topCapability(items);
  const research = all.filter((i) => i.type === "research" && (!category || i.categories.includes(category))).slice(0, 4);

  return (
    <div className="flex flex-wrap items-start gap-6">
      <aside aria-label="Filters" className="flex w-full min-w-0 flex-col gap-6 md:w-auto md:max-w-[250px] md:flex-[1_1_220px]">
        <CategoryRail includeAll active={category} hrefFor={(id) => (id ? `/category/${id}/` : "/")} />
        <ProviderFilter
          legend={t("provider", lang)}
          selected={providers as Set<(typeof PROVIDERS)[number]>}
          onToggle={(p) => setProviders((s) => toggle(s, p))}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="label-mono px-2.5 pb-2.5">{t("type", lang)}</legend>
          <div className="flex flex-wrap gap-1.5 px-2.5">
            {CONTENT_TYPES.filter((c) => c !== "event" && c !== "news").map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={types.has(c)}
                onClick={() => setTypes((s) => toggle(s, c))}
                className={`min-h-8 rounded-full border px-2.5 text-[13px] ${
                  types.has(c) ? "border-text bg-raised text-strong" : "border-control text-sub"
                }`}
              >
                {TYPE_LABEL[c][lang]}
              </button>
            ))}
          </div>
        </fieldset>
      </aside>

      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-[26px] font-semibold tracking-tight">{t("latestAcross", lang)}</h1>
          <div role="group" aria-label="Time range" className="flex gap-1 font-mono text-[13px]">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={range === r.id}
                onClick={() => setRange(r.id)}
                className={`min-h-8 rounded-md px-2.5 ${range === r.id ? "bg-raised text-strong" : "text-muted"}`}
              >
                {r.id === "all" ? t("everything", lang) : r.label}
              </button>
            ))}
          </div>
        </div>
        {feed.status === "ready" ? (
          <>
            <FeedList items={items} />
            <p className="text-sm text-muted">
              {t("updatedAt", lang)}: {dateTime(feed.snapshot.generatedAt, lang)}
            </p>
          </>
        ) : (
          <FeedStatus status={feed.status} message={feed.status === "error" ? feed.message : undefined} />
        )}
      </main>

      <aside aria-label="Context" className="flex max-w-[360px] flex-[1_1_300px] flex-col gap-4">
        {focus && <EquivalentsCard capability={focus} />}
        <ItemListCard title={t("research", lang)} items={research} />
        <EventsCard />
      </aside>
    </div>
  );
}
