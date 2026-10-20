import type { Lang } from "./prefs";

export function shortDate(iso: string, lang: Lang): string {
  const d = new Date(iso);
  return lang === "zh"
    ? `${d.getMonth() + 1}月${d.getDate()}日`
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function dateTime(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleString(lang === "zh" ? "zh-TW" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
