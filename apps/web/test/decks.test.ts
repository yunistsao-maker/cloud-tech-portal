import { getCapability, getCategory } from "@ctp/catalog";
import { describe, expect, it } from "vitest";
import { deckHref, decks, deckStops, neighbours } from "../lib/decks";
import { publications } from "../lib/publications";
import { reports } from "../lib/reports";

/** Every page a deck generates, as a path. */
const pagesOf = (d: (typeof decks)[number]) => new Set(deckStops(d).map((s) => s.href));

describe("decks", () => {
  it("point at real catalog categories and capabilities", () => {
    for (const d of decks) {
      for (const c of d.categories) expect(getCategory(c), `${d.slug}: ${c}`).toBeDefined();
      for (const c of d.capabilities) expect(getCapability(c), `${d.slug}: ${c}`).toBeDefined();
    }
  });

  it("share /reports/<slug>/ with reports without colliding", () => {
    const slugs = [...reports, ...decks].map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(publications.filter((p) => p.kind === "deck")).toHaveLength(decks.length);
  });

  it("give each topic a unique slug and number, distinct from the appendix", () => {
    for (const d of decks) {
      const slugs = d.topics.map((t) => t.slug);
      expect(new Set([...slugs, d.appendix.slug]).size, d.slug).toBe(slugs.length + 1);
      expect(d.topics.map((t) => t.num)).toEqual(d.topics.map((_, i) => String(i + 1).padStart(2, "0")));
    }
  });

  it("list every deep-dive section, with unique anchors", () => {
    for (const d of decks)
      for (const t of d.topics) {
        const ids = [...t.deepHtml.matchAll(/<h2 id="([^"]+)">/g)].map((m) => m[1]);
        expect(t.sections.map((s) => s.id), `${d.slug}/${t.slug}`).toEqual(ids);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids).not.toContain("main"); // the shell's skip-link target
      }
  });

  it("keep diagram ids unique across a deck (the cover shows every diagram)", () => {
    for (const d of decks) {
      const ids = d.topics.flatMap((t) => [...t.svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
      expect(new Set(ids).size, d.slug).toBe(ids.length);
      for (const t of d.topics)
        for (const [, ref] of t.svg.matchAll(/url\(#([^)]+)\)/g)) expect(t.svg, `${t.slug}: #${ref}`).toContain(`id="${ref}"`);
    }
  });

  it("contain no script or event handlers in injected markup", () => {
    for (const d of decks)
      for (const t of d.topics)
        for (const html of [t.svg, t.deepHtml]) {
          expect(html, t.slug).not.toMatch(/<script|<iframe|<object|<embed|javascript:/i);
          expect(html, t.slug).not.toMatch(/\son[a-z]+\s*=/i);
        }
  });

  it("link only to pages the deck generates, or out to https", () => {
    for (const d of decks) {
      const pages = pagesOf(d);
      for (const t of d.topics)
        for (const [, href = ""] of t.deepHtml.matchAll(/href="([^"]+)"/g)) {
          if (href.startsWith("https://")) continue;
          expect(pages, `${t.slug} → ${href}`).toContain(href.replace(/#.*$/, ""));
        }
    }
  });

  it("read cover → diagram → deep dive per topic → appendix", () => {
    for (const d of decks) {
      const stops = deckStops(d);
      expect(stops).toHaveLength(d.topics.length * 2 + 2);
      expect(stops[0]?.kind).toBe("cover");
      expect(stops.at(-1)?.kind).toBe("appendix");
      expect(neighbours(d, deckHref(d.slug)).prev).toBeUndefined();
      const first = d.topics[0]!;
      expect(neighbours(d, deckHref(d.slug, first.slug)).next?.href).toBe(deckHref(d.slug, first.slug, true));
      expect(neighbours(d, deckHref(d.slug, d.appendix.slug)).next).toBeUndefined();
    }
  });
});
