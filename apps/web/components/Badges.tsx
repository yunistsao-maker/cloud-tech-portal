import { PROVIDER_LABEL, type FeedItem, type Status } from "@ctp/catalog";
import { STATUS_LABEL } from "@/lib/i18n";
import type { Lang } from "@/lib/prefs";

const PROVIDER_CLASS: Record<FeedItem["provider"], string> = {
  aws: "bg-aws-bg text-aws",
  azure: "bg-azure-bg text-azure",
  gcp: "bg-gcp-bg text-gcp",
  independent: "bg-raised text-sub",
};

export function providerName(p: FeedItem["provider"], lang: Lang): string {
  if (p === "independent") return lang === "zh" ? "學術 / 獨立" : "Independent";
  return PROVIDER_LABEL[p];
}

export function ProviderBadge({ provider, lang }: { provider: FeedItem["provider"]; lang: Lang }) {
  return (
    <span className={`rounded px-2 py-0.5 font-mono text-xs ${PROVIDER_CLASS[provider]}`}>
      {providerName(provider, lang)}
    </span>
  );
}

const STATUS_CLASS: Record<Status, string> = {
  ga: "bg-gcp-bg text-gcp",
  preview: "bg-warn-bg text-warn",
  deprecated: "bg-danger-bg text-danger",
  renamed: "bg-raised text-sub",
};

export function StatusBadge({ status, lang }: { status: Status; lang: Lang }) {
  return <span className={`rounded px-2 py-0.5 font-mono text-xs ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status][lang]}</span>;
}

export const PROVIDER_TEXT = { aws: "text-aws", azure: "text-azure", gcp: "text-gcp" } as const;
