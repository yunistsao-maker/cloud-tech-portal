import { deckMetas } from "./deck-metas";
import { reportHref, reports } from "./reports";

/** A report or a diagram deck, as shown in listings and side cards. */
export interface Publication {
  kind: "report" | "deck";
  slug: string;
  href: string;
  title: string;
  summary: { en: string; zh: string };
  author: string;
  publishedAt: string;
  updatedAt?: string;
  categories: string[];
  capabilities: string[];
}

function pick(kind: Publication["kind"], p: Omit<Publication, "kind" | "href">): Publication {
  const { slug, title, summary, author, publishedAt, updatedAt, categories, capabilities } = p;
  return { kind, slug, href: reportHref(slug), title, summary, author, publishedAt, updatedAt, categories, capabilities };
}

/** Newest first. Decks live under /reports/ too, so one index lists both. */
export const publications: Publication[] = [
  ...reports.map((r) => pick("report", r)),
  ...deckMetas.map((d) => pick("deck", d)),
].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export function publicationsFor(f: { category?: string; capability?: string }): Publication[] {
  return publications.filter(
    (p) => (!f.category || p.categories.includes(f.category)) && (!f.capability || p.capabilities.includes(f.capability)),
  );
}
