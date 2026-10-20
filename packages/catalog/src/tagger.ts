import type { Capability, Provider, Status } from "./schema";
import { PROVIDERS } from "./schema";

interface Term {
  pattern: RegExp;
  capabilityId: string;
  /** Provider the term belongs to; undefined for provider-neutral keywords. */
  provider?: Provider;
  weight: number;
  /** A generic word ("Batch", "Workflows") that only counts on its own provider's items. */
  needsProviderMatch: boolean;
}

const BRAND = /^(amazon|aws|azure|microsoft|google|gemini|cloud)\b/i;

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termPattern(term: string) {
  // Word-ish boundaries that also work around "/", "." and "-" in names like "Pub/Sub".
  return new RegExp(`(?<![\\w-])${escape(term)}(?![\\w-])`, "i");
}

export interface Tagger {
  tag(input: { title: string; body?: string; provider?: Provider | "independent" }): TagResult[];
}

export interface TagResult {
  capabilityId: string;
  score: number;
}

export function buildTagger(capabilities: Capability[]): Tagger {
  const terms: Term[] = [];
  for (const cap of capabilities) {
    for (const p of PROVIDERS) {
      for (const s of cap.services[p]) {
        const names: [string, number][] = [
          [s.name, 3],
          ...(s.aliases ?? []).map((a): [string, number] => [a, 2]),
          ...(s.formerly ?? []).map((f): [string, number] => [f, 3]),
        ];
        for (const [name, weight] of names) {
          const generic = !BRAND.test(name) && (name.split(/\s+/).length === 1 || name.length <= 4);
          terms.push({ pattern: termPattern(name), capabilityId: cap.id, provider: p, weight, needsProviderMatch: generic });
        }
      }
    }
    for (const k of cap.keywords) {
      terms.push({ pattern: termPattern(k.trim()), capabilityId: cap.id, weight: 1, needsProviderMatch: false });
    }
  }

  return {
    tag({ title, body = "", provider }) {
      const scores = new Map<string, number>();
      for (const t of terms) {
        if (t.needsProviderMatch && t.provider !== provider) continue;
        let s = 0;
        if (t.pattern.test(title)) s += t.weight * 2;
        if (body && t.pattern.test(body)) s += t.weight;
        // A competitor's product named in the item is weaker evidence than the item's own provider.
        if (s && t.provider && provider && provider !== "independent" && t.provider !== provider) s = Math.ceil(s / 2);
        if (s) scores.set(t.capabilityId, (scores.get(t.capabilityId) ?? 0) + s);
      }
      return [...scores.entries()]
        .filter(([, score]) => score >= 3)
        .sort((a, b) => b[1] - a[1])
        .map(([capabilityId, score]) => ({ capabilityId, score }));
    },
  };
}

/** Read a release status out of an announcement title. */
export function detectStatus(text: string): Status | undefined {
  const t = text.toLowerCase();
  if (/\b(retire|retirement|deprecat|end of (support|life)|sunset|no longer available|maintenance mode)/.test(t)) return "deprecated";
  if (/\b(renamed|rebrand|is now called|now known as)\b/.test(t)) return "renamed";
  if (/\b(public preview|private preview|in preview|preview|beta)\b/.test(t)) return "preview";
  if (/\b(generally available|general availability|now available|\bga\b)/.test(t)) return "ga";
  return undefined;
}
