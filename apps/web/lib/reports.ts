import genaiDevopsAidlc from "../content/reports/genai-devops-aidlc.json";
import kirocrewCrossEnvAgents from "../content/reports/kirocrew-cross-env-agents.json";
import { Report } from "./report-schema";

/** Add new reports here after importing them with scripts/import-doc.ts. */
export const reports: Report[] = [genaiDevopsAidlc, kirocrewCrossEnvAgents]
  .map((r) => Report.parse(r))
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export function getReport(slug: string): Report | undefined {
  return reports.find((r) => r.slug === slug);
}

/** Reports and diagram decks share this path; see lib/publications.ts. */
export function reportHref(slug: string) {
  return `/reports/${slug}/`;
}
