import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeckDeepDive } from "@/components/decks/DeckPages";
import { decks, getDeck, getTopic } from "@/lib/decks";

export const dynamicParams = false;

export function generateStaticParams() {
  return decks.flatMap((d) => d.topics.map((t) => ({ slug: d.slug, page: t.slug })));
}

type Props = { params: Promise<{ slug: string; page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;
  const deck = getDeck(slug);
  const t = deck && getTopic(deck, page);
  return t ? { title: `${t.num} ${t.title} · Deep dive`, description: t.deepLede } : {};
}

export default async function DeckDeepDivePage({ params }: Props) {
  const { slug, page } = await params;
  const deck = getDeck(slug);
  const topic = deck && getTopic(deck, page);
  if (!deck || !topic) notFound();
  return <DeckDeepDive deck={deck} topic={topic} />;
}
