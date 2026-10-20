"use client";

import { getCapability, getCategory } from "@ctp/catalog";
import Link from "next/link";
import type { Report } from "@/lib/report-schema";
import { t } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { reportHref, reports } from "@/lib/reports";
import { compareHref } from "../SearchBox";
import { Card } from "../SideCards";

export function ReportHeader({ report }: { report: Report }) {
  const { lang } = usePrefs();
  const zhBody = report.lang.startsWith("zh");
  return (
    <header className="flex flex-col gap-3">
      <nav aria-label="Breadcrumb" className="font-mono text-[13px] text-muted">
        <Link href="/">{t("pulse", lang)}</Link> / <Link href="/reports/">{t("reports", lang)}</Link>
      </nav>
      <h1 className="text-[34px] font-semibold leading-tight tracking-tight">{report.title}</h1>
      <p className="max-w-[72ch] text-[17px] leading-relaxed text-sub">{report.summary[lang]}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span>{report.author}</span>
        <time dateTime={report.publishedAt}>{report.publishedAt}</time>
        {zhBody && lang === "en" && <span>{t("bodyInChinese", lang)}</span>}
        <a href={report.sourceUrl} target="_blank" rel="noreferrer" className="text-strong underline">
          {t("editableSource", lang)} ↗
        </a>
      </div>
    </header>
  );
}

export function ReportAside({ report }: { report: Report }) {
  const { lang } = usePrefs();
  const toc = report.blocks.filter((b) => b.type === "heading" && b.level === 2) as Extract<Report["blocks"][number], { type: "heading" }>[];
  const caps = report.capabilities.map((id) => getCapability(id)).filter((c) => !!c);
  return (
    <>
      <nav aria-label={t("contents", lang)} className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4.5">
        <h2 className="label-mono pb-1.5 font-medium">{t("contents", lang)}</h2>
        {toc.map((h) => (
          <a key={h.id} href={`#${h.id}`} className="py-1 text-sm leading-snug text-sub">
            {h.text}
          </a>
        ))}
      </nav>
      <Card title={t("coversCapabilities", lang)}>
        <div className="flex flex-wrap gap-1.5">
          {caps.map((c) => (
            <Link key={c.id} href={compareHref(c.category, c.id)} className="rounded-full border border-control px-2.5 py-1 text-[13px] text-sub">
              {c.name[lang]}
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}

export function ReportCard({ report }: { report: Report }) {
  const { lang } = usePrefs();
  return (
    <Link href={reportHref(report.slug)} className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-5 hover:no-underline">
      <div className="flex flex-wrap gap-1.5">
        {report.categories.map((id) => (
          <span key={id} className="rounded bg-raised px-2 py-0.5 font-mono text-xs text-sub">
            {getCategory(id)?.name[lang] ?? id}
          </span>
        ))}
      </div>
      <span className="text-xl font-semibold leading-snug text-strong">{report.title}</span>
      <span className="leading-relaxed text-sub">{report.summary[lang]}</span>
      <span className="text-sm text-muted">
        {report.author} · {report.publishedAt}
      </span>
    </Link>
  );
}

export function ReportsIndex() {
  const { lang } = usePrefs();
  return (
    <div className="flex max-w-[960px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[30px] font-semibold tracking-tight">{t("reports", lang)}</h1>
        <p className="text-sub">{t("reportsIntro", lang)}</p>
      </div>
      <div className="flex flex-col gap-4">
        {reports.map((r) => (
          <ReportCard key={r.slug} report={r} />
        ))}
      </div>
    </div>
  );
}

/** Side card for hubs, Pulse and Compare: reports that cover this category or capability. */
export function ReportsCard({ items }: { items: Report[] }) {
  const { lang } = usePrefs();
  if (items.length === 0) return null;
  return (
    <Card title={t("reports", lang)}>
      {items.map((r) => (
        <Link key={r.slug} href={reportHref(r.slug)} className="flex flex-col gap-1 text-sm leading-snug">
          <span className="font-medium text-strong">{r.title}</span>
          <span className="text-muted">
            {r.author} · {r.publishedAt}
          </span>
        </Link>
      ))}
    </Card>
  );
}
