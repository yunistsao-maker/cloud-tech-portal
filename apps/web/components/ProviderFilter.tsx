"use client";

import { PROVIDERS, PROVIDER_LABEL, type Provider } from "@ctp/catalog";
import { PROVIDER_TEXT } from "./Badges";

const ACCENT: Record<Provider, string> = { aws: "accent-aws", azure: "accent-azure", gcp: "accent-gcp" };

export function ProviderFilter({
  legend,
  selected,
  onToggle,
}: {
  legend: string;
  selected: Set<Provider>;
  onToggle: (p: Provider) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="label-mono px-2.5 pb-2.5">{legend}</legend>
      {PROVIDERS.map((p) => (
        <label key={p} className="flex min-h-9 cursor-pointer items-center gap-2.5 px-2.5">
          <input type="checkbox" checked={selected.has(p)} onChange={() => onToggle(p)} className={`size-4 ${ACCENT[p]}`} />
          <span className={`font-medium ${PROVIDER_TEXT[p]}`}>{PROVIDER_LABEL[p]}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function toggle<T>(set: Set<T>, v: T): Set<T> {
  const next = new Set(set);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
}
