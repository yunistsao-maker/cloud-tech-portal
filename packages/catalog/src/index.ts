import { z } from "zod";
import categoriesJson from "../data/categories.json";
import compute from "../data/capabilities/compute.json";
import storage from "../data/capabilities/storage.json";
import networking from "../data/capabilities/networking.json";
import database from "../data/capabilities/database.json";
import analytics from "../data/capabilities/analytics.json";
import aiMl from "../data/capabilities/ai-ml.json";
import security from "../data/capabilities/security.json";
import integration from "../data/capabilities/integration.json";
import devops from "../data/capabilities/devops.json";
import { Capability, Category, PROVIDERS, type Provider } from "./schema";

export * from "./schema";
export * from "./tagger";

const rawCapabilities = [
  ...compute,
  ...storage,
  ...networking,
  ...database,
  ...analytics,
  ...aiMl,
  ...security,
  ...integration,
  ...devops,
];

/** Parsed once at import: a malformed catalog fails the build, not the page. */
export const categories: Category[] = z.array(Category).parse(categoriesJson);
export const capabilities: Capability[] = z.array(Capability).parse(rawCapabilities);

const byId = new Map(capabilities.map((c) => [c.id, c]));
const categoryById = new Map(categories.map((c) => [c.id, c]));

export function getCapability(id: string): Capability | undefined {
  return byId.get(id);
}

export function getCategory(id: string): Category | undefined {
  return categoryById.get(id);
}

export function capabilitiesIn(categoryId: string): Capability[] {
  return capabilities.filter((c) => c.category === categoryId);
}

/** "Amazon EC2" or "Azure SQL Database · Azure Database for PostgreSQL". */
export function serviceLabel(cap: Capability, provider: Provider): string {
  const list = cap.services[provider];
  return list.length ? list.map((s) => s.name).join(" · ") : "—";
}

export interface SearchHit {
  capability: Capability;
  provider?: Provider;
  matched: string;
  /** Set when the query matched a retired name, e.g. "Vertex AI". */
  formerlyOf?: string;
}

/** Find capabilities by service name, alias, former name or capability name. */
export function searchCatalog(query: string, limit = 8): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: (SearchHit & { rank: number })[] = [];
  for (const cap of capabilities) {
    let best: (SearchHit & { rank: number }) | undefined;
    const consider = (term: string, rank: number, extra: Omit<SearchHit, "capability" | "matched">) => {
      const t = term.toLowerCase();
      const idx = t.indexOf(q);
      if (idx < 0) return;
      const r = rank + (idx === 0 ? 0 : 1) + (t === q ? -1 : 0);
      if (!best || r < best.rank) best = { capability: cap, matched: term, rank: r, ...extra };
    };
    consider(cap.name.en, 2, {});
    consider(cap.name.zh, 2, {});
    for (const p of PROVIDERS) {
      for (const s of cap.services[p]) {
        consider(s.name, 0, { provider: p });
        for (const a of s.aliases ?? []) consider(a, 1, { provider: p });
        for (const f of s.formerly ?? []) consider(f, 1, { provider: p, formerlyOf: s.name });
      }
    }
    if (best) hits.push(best);
  }
  return hits
    .sort((a, b) => a.rank - b.rank || a.capability.name.en.localeCompare(b.capability.name.en))
    .slice(0, limit)
    .map(({ rank: _rank, ...h }) => h);
}
