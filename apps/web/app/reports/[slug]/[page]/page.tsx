import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeckAppendix, DeckDiagram } from "@/components/decks/DeckPages";
import { decks, getDeck, getTopic } from "@/lib/decks";

export const dynamicParams = false;

/** A deck topic's diagram page, or the deck's appendix. */
export function generateStaticParams() {
  return decks.flatMap((d) => [...d.topics.map((t) => t.slug), d.appendix.slug].map((page) => ({ slug: d.slug, page })));
}

type Props = { params: Promise<{ slug: string; page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;
  const deck = getDeck(slug);
  if (!deck) return {};
  if (page === deck.appendix.slug) return { title: `${deck.appendix.title} · ${deck.title}` };
  const t = getTopic(deck, page);
  return t ? { title: `${t.num} ${t.title} · 圖解`, description: t.lede } : {};
}

export default async function DeckPage({ params }: Props) {
  const { slug, page } = await params;
  const deck = getDeck(slug);
  if (!deck) notFound();
  if (page === deck.appendix.slug) return <DeckAppendix deck={deck} />;
  const topic = getTopic(deck, page);
  if (!topic) notFound();
  return <DeckDiagram deck={deck} topic={topic} />;
}
