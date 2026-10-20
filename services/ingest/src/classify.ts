import { createHash } from "node:crypto";
import { detectStatus, getCapability, type FeedItem, type Status, type Tagger } from "@ctp/catalog";
import type { RawEntry } from "./parse";
import type { Source } from "./sources";

export function itemId(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

export interface Draft {
  item: FeedItem;
  /** Text handed to the summariser; never stored. */
  body: string;
  /** Tagger's ranked capability ids, offered to the model as hints. */
  candidates: string[];
}

function statusFrom(entry: RawEntry): Status | undefined {
  if (entry.label && /deprecat|breaking|retire/i.test(entry.label)) return "deprecated";
  // Azure prefixes titles with "[Launched]", "[In preview]", "[Retirement]".
  return detectStatus(`${entry.title} ${entry.categories.slice(0, 2).join(" ")}`);
}

export function classify(entry: RawEntry, source: Source, tagger: Tagger): Draft | undefined {
  const tags = tagger.tag({
    title: entry.title,
    body: `${entry.categories.join(", ")}\n${entry.body.slice(0, 2000)}`,
    provider: source.provider,
  });
  if (source.requireCapability && tags.length === 0) return undefined;
  const capabilities = tags.slice(0, 3).map((t) => t.capabilityId);
  const status = statusFrom(entry);
  const type = source.type === "announcement" && (status === "deprecated" || status === "renamed") ? "lifecycle" : source.type;
  return {
    item: {
      id: itemId(entry.key),
      url: entry.url,
      title: entry.title,
      sourceId: source.id,
      sourceName: source.name,
      provider: source.provider,
      type,
      publishedAt: entry.publishedAt,
      capabilities,
      categories: categoriesFor(capabilities),
      ...(status ? { status } : {}),
    },
    body: entry.body,
    candidates: tags.slice(0, 6).map((t) => t.capabilityId),
  };
}

export function categoriesFor(capabilityIds: string[]): string[] {
  return [...new Set(capabilityIds.map((id) => getCapability(id)?.category).filter((c): c is string => !!c))];
}
