import { XMLParser } from "fast-xml-parser";
import { stripHtml, truncateWords } from "./html";
import type { Source } from "./sources";

/** One entry as read from a feed, before tagging or summarising. */
export interface RawEntry {
  /** Stable key for de-duplication: guid, Atom id, or URL. */
  key: string;
  url: string;
  title: string;
  publishedAt: string;
  /** Plain-text body, already stripped of HTML. */
  body: string;
  /** Feed categories (AWS and Azure put product names here). */
  categories: string[];
  /** Section label from the feed, e.g. "Deprecated" in Google Cloud release notes. */
  label?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  htmlEntities: true,
  isArray: (name) => ["item", "entry", "category", "link"].includes(name),
});

type Node = Record<string, unknown>;

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === "object") return text((v as Node)["#text"]);
  return "";
}

function iso(date: string): string | undefined {
  const d = new Date(date.trim());
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function atomLink(links: unknown): string {
  const list = (Array.isArray(links) ? links : [links]) as (Node | string)[];
  const alt = list.find((l) => typeof l === "object" && (l["@_rel"] === undefined || l["@_rel"] === "alternate"));
  if (alt && typeof alt === "object") return String(alt["@_href"] ?? "");
  return text(list[0]);
}

function categoriesOf(v: unknown): string[] {
  const list = Array.isArray(v) ? v : v ? [v] : [];
  return list
    .flatMap((c) => (typeof c === "object" && c ? [text(c) || String((c as Node)["@_term"] ?? "")] : [text(c)]))
    .flatMap((c) => c.split(","))
    .map((c) => c.replace(/^[a-z-]+:[a-z-]+\//i, "").replace(/[-_]/g, " ").trim())
    .filter(Boolean);
}

export function parseFeed(xml: string, source: Source): RawEntry[] {
  const doc = parser.parse(xml) as Node;
  const limit = source.limit ?? 30;
  return source.format === "gcp-release-notes" ? parseGcpReleaseNotes(doc, limit) : parseGeneric(doc, source).slice(0, limit);
}

function parseGeneric(doc: Node, source: Source): RawEntry[] {
  const rss = (doc.rss as Node | undefined)?.channel as Node | undefined;
  const out: RawEntry[] = [];
  if (rss) {
    for (const item of (rss.item as Node[] | undefined) ?? []) {
      if (source.format === "arxiv") {
        const kind = text(item["arxiv:announce_type"]);
        if (kind && kind !== "new") continue;
      }
      const url = text(item.link).trim();
      const title = stripHtml(text(item.title));
      const publishedAt = iso(text(item.pubDate) || text(item["a10:updated"]) || text(item["dc:date"]));
      if (!url || !title || !publishedAt) continue;
      let body = stripHtml(text(item.description) || text(item["content:encoded"]));
      // arXiv prefixes every abstract with "arXiv:2610.12345v1 Announce Type: new Abstract:".
      if (source.format === "arxiv") body = body.replace(/^arXiv:\S+\s+Announce Type:\s*\w+\s+Abstract:\s*/i, "");
      out.push({
        key: text(item.guid) || url,
        url,
        title,
        publishedAt,
        body,
        categories: categoriesOf(item.category),
      });
    }
    return out;
  }
  const feed = doc.feed as Node | undefined;
  for (const entry of (feed?.entry as Node[] | undefined) ?? []) {
    const url = atomLink(entry.link);
    const title = stripHtml(text(entry.title));
    const publishedAt = iso(text(entry.published) || text(entry.updated));
    if (!url || !title || !publishedAt) continue;
    out.push({
      key: text(entry.id) || url,
      url,
      title,
      publishedAt,
      body: stripHtml(text(entry.summary) || text(entry.content)),
      categories: categoriesOf(entry.category),
    });
  }
  return out;
}

/**
 * Google Cloud publishes one Atom entry per day holding every product's notes.
 * Split it into one entry per product so each can be tagged and compared on its own.
 */
function parseGcpReleaseNotes(doc: Node, days: number): RawEntry[] {
  const feed = doc.feed as Node | undefined;
  const out: RawEntry[] = [];
  for (const entry of ((feed?.entry as Node[] | undefined) ?? []).slice(0, days)) {
    const url = atomLink(entry.link);
    const publishedAt = iso(text(entry.updated));
    const html = text(entry.content);
    if (!url || !publishedAt || !html) continue;
    const parts = html.split(/<h2[^>]*class="[^"]*release-note-product-title[^"]*"[^>]*>/i).slice(1);
    for (const part of parts) {
      const end = part.indexOf("</h2>");
      if (end < 0) continue;
      const product = stripHtml(part.slice(0, end));
      const rest = part.slice(end + 5);
      const label = stripHtml(/<h3[^>]*>([\s\S]*?)<\/h3>/i.exec(rest)?.[1] ?? "");
      const body = stripHtml(rest.replace(/<h3[^>]*>[\s\S]*?<\/h3>/gi, " "));
      const first = body.split("\n").find((l) => l.length > 20) ?? body;
      if (!product || !first) continue;
      out.push({
        key: `${text(entry.id) || url}::${product}`,
        url,
        title: `${product}${label ? ` · ${label}` : ""}: ${truncateWords(first, 150)}`,
        publishedAt,
        body: truncateWords(body, 3000),
        categories: [product],
        label: label || undefined,
      });
    }
  }
  return out;
}
