"use client";

import {
  capabilitiesIn,
  getCategory,
  PROVIDERS,
  PROVIDER_LABEL,
  serviceLabel,
  type Capability,
  type Provider,
} from "@ctp/catalog";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { shortDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { recentlyChanged, useFeed } from "@/lib/items";
import { usePrefs } from "@/lib/prefs";
import { reportsFor } from "@/lib/reports";
import { PROVIDER_TEXT, ProviderBadge } from "./Badges";
import { ReportsCard } from "./reports/ReportChrome";
import { CategoryRail } from "./CategoryRail";
import { ProviderFilter, toggle } from "./ProviderFilter";
import { compareHref } from "./SearchBox";

const DEFAULT_CAT = "ai-ml";

export function ComparePage() {
  const { lang } = usePrefs();
  const router = useRouter();
  const params = useSearchParams();
  const feed = useFeed();
  const [shown, setShown] = useState(new Set<Provider>(PROVIDERS));

  const catId = getCategory(params.get("cat") ?? "") ? params.get("cat")! : DEFAULT_CAT;
  const caps = capabilitiesIn(catId);
  const selected = caps.find((c) => c.id === params.get("cap")) ?? caps[0]!;
  const cat = getCategory(catId)!;

  const items = feed.status === "ready" ? feed.snapshot.items : [];
  const changed = useMemo(() => recentlyChanged(items), [items]);
  const cols = PROVIDERS.filter((p) => shown.has(p));
  const grid = { gridTemplateColumns: `1.2fr repeat(${cols.length}, minmax(0, 1fr))` };

  const pick = (catNext: string, capNext: string) => router.replace(compareHref(catNext, capNext), { scroll: false });

  return (
    <div className="flex flex-wrap items-start gap-6">
      <aside aria-label="Filters" className="flex w-full min-w-0 flex-col gap-6 md:w-auto md:max-w-[250px] md:flex-[1_1_220px]">
        <CategoryRail active={catId} onPick={(id) => pick(id, capabilitiesIn(id)[0]!.id)} />
        <ProviderFilter legend={t("providerColumns", lang)} selected={shown} onToggle={(p) => setShown((s) => toggle(s, p))} />
        <p className="px-2.5 text-[13px] leading-normal text-muted">
          <span className="text-dot" aria-hidden="true">
            ●
          </span>{" "}
          = {t("changedRecently", lang)}
        </p>
      </aside>

      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-[26px] font-semibold tracking-tight">
            {cat.name[lang]} · {t("equivalentServices", lang)}
          </h1>
          <span className="font-mono text-[13px] text-muted">
            {caps.length} {t("capabilities", lang).toLowerCase()}
          </span>
        </div>
        <section aria-label="Capability matrix" className="overflow-x-auto rounded-xl border border-border bg-surface">
          <div className="min-w-[560px]">
            <div className="label-mono grid border-b border-border px-4.5 py-3" style={grid}>
              <span>{t("capability", lang)}</span>
              {cols.map((p) => (
                <span key={p} className={PROVIDER_TEXT[p]}>
                  {PROVIDER_LABEL[p]}
                </span>
              ))}
            </div>
            {caps.map((c) => {
              const on = c.id === selected.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pick(catId, c.id)}
                  style={grid}
                  className={`grid min-h-16 w-full items-center border-b border-line px-4.5 py-3.5 text-left last:border-b-0 ${
                    on ? "bg-raised shadow-[inset_3px_0_0_var(--accent)]" : ""
                  }`}
                >
                  <span className="flex flex-col gap-0.5 pr-3">
                    <span className="font-medium">{c.name[lang]}</span>
                    <span className="text-[13px] text-muted">{c.name[lang === "en" ? "zh" : "en"]}</span>
                  </span>
                  {cols.map((p) => (
                    <span key={p} className="flex items-center gap-2 pr-3">
                      {changed.get(c.id)?.has(p) && <span className="size-2 shrink-0 rounded-full bg-dot" aria-label={t("changedRecently", lang)} />}
                      {serviceLabel(c, p)}
                    </span>
                  ))}
                </button>
              );
            })}
          </div>
        </section>
      </main>

      <aside aria-label="Capability detail" className="flex max-w-[400px] min-w-0 flex-[1_1_320px] flex-col gap-4">
        <Detail capability={selected} />
      </aside>
    </div>
  );
}

function Detail({ capability }: { capability: Capability }) {
  const { lang } = usePrefs();
  const feed = useFeed();
  const news =
    feed.status === "ready" ? feed.snapshot.items.filter((i) => i.capabilities.includes(capability.id)).slice(0, 6) : [];
  const cat = getCategory(capability.category)!;
  return (
    <>
      <section className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-4.5">
        <div className="flex flex-col gap-1">
          <div className="label-mono">{cat.name[lang]}</div>
          <h2 className="text-[22px] font-semibold">{capability.name[lang]}</h2>
          <div className="text-sm text-muted">{capability.name[lang === "en" ? "zh" : "en"]}</div>
        </div>
        <div className="flex flex-col gap-2">
          {PROVIDERS.map((p) => {
            const formerly = capability.services[p].flatMap((s) => s.formerly ?? []);
            return (
              <div key={p} className="flex justify-between gap-2.5 rounded-lg bg-raised px-3 py-2.5">
                <span className={`font-medium ${PROVIDER_TEXT[p]}`}>{PROVIDER_LABEL[p]}</span>
                <span className="text-right">
                  {serviceLabel(capability, p)}
                  {formerly.length > 0 && (
                    <span className="block text-xs text-muted">
                      {t("formerly", lang)}: {formerly.join(", ")}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        {capability.attributes?.length ? (
          <dl className="flex flex-col border-t border-border">
            {capability.attributes.map((a) => (
              <div key={a.label.en} className="flex flex-col gap-1.5 border-b border-line py-3">
                <dt className="label-mono normal-case tracking-normal">
                  {a.label[lang]}
                  {a.needsReview && <span className="ml-2 rounded bg-warn-bg px-1.5 text-warn">{t("needsReview", lang)}</span>}
                </dt>
                <dd className="grid grid-cols-3 gap-2.5 text-[13px] leading-snug">
                  {PROVIDERS.map((p) => (
                    <span key={p}>
                      <span className={`sr-only`}>{PROVIDER_LABEL[p]}: </span>
                      {a.values[p]}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="rounded-lg bg-raised p-3 text-sm text-sub">{t("notAuthored", lang)}</p>
        )}
      </section>
      <ReportsCard items={reportsFor({ capability: capability.id })} />
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4.5">
        <h2 className="label-mono font-medium">{t("recentChanges", lang)}</h2>
        {news.length === 0 && <p className="text-sm text-muted">{t("noRecentChanges", lang)}</p>}
        {news.map((n) => (
          <a key={n.id} href={n.url} target="_blank" rel="noreferrer" className="flex gap-2.5 text-sm leading-snug">
            <span className="w-14 shrink-0 pt-0.5 font-mono text-xs text-muted">{shortDate(n.publishedAt, lang)}</span>
            <span className="flex flex-col items-start gap-1">
              <ProviderBadge provider={n.provider} lang={lang} />
              <span>{n.title}</span>
            </span>
          </a>
        ))}
      </section>
    </>
  );
}
