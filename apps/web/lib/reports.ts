import genaiDevopsAidlc from "../content/reports/genai-devops-aidlc.json";
import { Report } from "./report-schema";

/** Add new reports here after importing them with scripts/import-doc.ts. */
export const reports: Report[] = [genaiDevopsAidlc]
  .map((r) => Report.parse(r))
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export function getReport(slug: string): Report | undefined {
  return reports.find((r) => r.slug === slug);
}

export function reportsFor(f: { category?: string; capability?: string }): Report[] {
  return reports.filter(
    (r) => (!f.category || r.categories.includes(f.category)) && (!f.capability || r.capabilities.includes(f.capability)),
  );
}

export function reportHref(slug: string) {
  return `/reports/${slug}/`;
}
