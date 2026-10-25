import multicloudZonesBody from "../content/decks/multicloud-zones/deck.json";
import { DeckBody, type Deck, type DeckTopic } from "./deck-schema";
import { deckMetas } from "./deck-metas";

/**
 * Full decks, diagrams included. Import this only from server components (the route
 * pages); listings use lib/deck-metas so the diagrams stay out of client bundles.
 */
const BODIES: Record<string, unknown> = {
  "multicloud-zones": multicloudZonesBody,
};

export const decks: Deck[] = deckMetas.map((m) => ({ ...m, ...DeckBody.parse(BODIES[m.slug]) }));

export function getDeck(slug: string): Deck | undefined {
  return decks.find((d) => d.slug === slug);
}

export function getTopic(deck: Deck, slug: string): DeckTopic | undefined {
  return deck.topics.find((t) => t.slug === slug);
}

export function deckHref(slug: string, page?: string, deepDive?: boolean) {
  return `/reports/${slug}/${page ? `${page}/` : ""}${deepDive ? "deep-dive/" : ""}`;
}

/** One stop in the reading order: cover, then diagram + deep dive per topic, then the appendix. */
export type DeckStop =
  | { kind: "cover"; href: string }
  | { kind: "diagram" | "deep"; href: string; num: string; short: string }
  | { kind: "appendix"; href: string; title: string };

export function deckStops(deck: Deck): DeckStop[] {
  return [
    { kind: "cover", href: deckHref(deck.slug) },
    ...deck.topics.flatMap((t): DeckStop[] => [
      { kind: "diagram", href: deckHref(deck.slug, t.slug), num: t.num, short: t.short },
      { kind: "deep", href: deckHref(deck.slug, t.slug, true), num: t.num, short: t.short },
    ]),
    { kind: "appendix", href: deckHref(deck.slug, deck.appendix.slug), title: deck.appendix.title },
  ];
}

/** Previous and next stops around the page at `href`. */
export function neighbours(deck: Deck, href: string): { prev?: DeckStop; next?: DeckStop } {
  const stops = deckStops(deck);
  const i = stops.findIndex((s) => s.href === href);
  return { prev: stops[i - 1], next: i >= 0 ? stops[i + 1] : undefined };
}
