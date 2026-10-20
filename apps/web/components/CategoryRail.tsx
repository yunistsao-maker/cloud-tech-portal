"use client";

import { categories } from "@ctp/catalog";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";

const itemClass = (active: boolean) =>
  `flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-md px-2.5 text-left ${
    active ? "bg-raised font-medium text-strong shadow-[inset_2px_0_0_var(--accent)]" : "text-sub"
  }`;

/** Category list: links on Pulse and hubs, buttons on Compare. */
export function CategoryRail({
  active,
  hrefFor,
  onPick,
  includeAll,
}: {
  active?: string;
  hrefFor?: (id: string | undefined) => string;
  onPick?: (id: string) => void;
  includeAll?: boolean;
}) {
  const { lang } = usePrefs();
  const entries = [...(includeAll ? [{ id: undefined, label: t("allCategories", lang) }] : []), ...categories.map((c) => ({ id: c.id, label: c.name[lang] }))];
  return (
    // A scrolling row of chips on phones, a vertical rail from md up.
    <nav aria-label={t("category", lang)} className="-mx-6 flex gap-0.5 overflow-x-auto px-6 md:mx-0 md:flex-col md:px-0">
      <div className="label-mono hidden px-2.5 pb-1.5 md:block">{t("category", lang)}</div>
      {entries.map((e) =>
        onPick && e.id ? (
          <button key={e.id} type="button" aria-pressed={active === e.id} onClick={() => onPick(e.id!)} className={itemClass(active === e.id)}>
            {e.label}
          </button>
        ) : (
          <Link key={e.id ?? "all"} href={hrefFor!(e.id)} aria-current={active === e.id ? "page" : undefined} className={itemClass(active === e.id)}>
            {e.label}
          </Link>
        ),
      )}
    </nav>
  );
}
