import Link from "next/link";
import type { ReactNode } from "react";
import { CLOUDS, type Deck, type DeckTopic, type Zone } from "@/lib/deck-schema";
import { deckHref, neighbours } from "@/lib/decks";
import { Checklist, DeckBar, DeckByline, DeckPager, Tr, type TocEntry } from "./DeckChrome";
import "./deck.css";

/*
 * Server-rendered deck pages. Diagram and deep-dive markup come from the deck's own
 * generator (content/decks/<slug>/source), so it is trusted, checked in tests, and
 * injected as HTML; the full text and diagrams are in the static export.
 */

const ZONE_CHIP: Record<Zone, [string, string]> = {
  ext: ["z-ext", "External"],
  dmz: ["z-dmz", "DMZ"],
  int: ["z-int", "Internal"],
  mgmt: ["z-mgmt", "Mgmt"],
  peer: ["z-ext", "Peer"],
};
const CLOUD_NAME = { aws: "AWS", azure: "Azure", gcp: "Google Cloud" } as const;

function toc(deck: Deck, current: string): TocEntry[] {
  return [
    { kind: "cover", href: deckHref(deck.slug), current: current === "cover" },
    ...deck.topics.map((t): TocEntry => ({ kind: "topic", href: deckHref(deck.slug, t.slug), num: t.num, title: t.title, current: current === t.slug })),
    { kind: "appendix", href: deckHref(deck.slug, deck.appendix.slug), title: deck.appendix.title, current: current === "appendix" },
  ];
}

function Frame(props: {
  deck: Deck;
  href: string;
  current: string;
  bar: { kind: "cover" | "topic" | "appendix"; num?: string; title?: string };
  views?: { diagram: string; deep: string; current: "diagram" | "deep" };
  diagram?: boolean;
  children: ReactNode;
}) {
  const { deck } = props;
  const { prev, next } = neighbours(deck, props.href);
  return (
    <div className={props.diagram ? "deck is-diagram" : "deck"}>
      <DeckBar
        deckHref={deckHref(deck.slug)}
        deckTitle={deck.title}
        kind={props.bar.kind}
        num={props.bar.num ?? null}
        title={props.bar.title ?? null}
        views={props.views}
        toc={toc(deck, props.current)}
      />
      {props.children}
      <DeckPager prev={prev} next={next} />
    </div>
  );
}

function ZoneChips({ zones }: { zones: Zone[] }) {
  return (
    <div className="zchips">
      {zones.map((z) => (
        <span key={z} className={`zchip ${ZONE_CHIP[z][0]}`}>
          <i />
          {ZONE_CHIP[z][1]}
        </span>
      ))}
    </div>
  );
}

function Svg({ markup, className }: { markup: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: markup }} />;
}

export function DeckCover({ deck }: { deck: Deck }) {
  const first = deck.topics[0];
  const href = deckHref(deck.slug);
  return (
    <Frame deck={deck} href={href} current="cover" bar={{ kind: "cover" }}>
      <main className="home">
        <section className="cover">
          <nav aria-label="Breadcrumb" className="crumbs">
            <Link href="/">
              <Tr k="pulse" />
            </Link>{" "}
            /{" "}
            <Link href="/reports/">
              <Tr k="reports" />
            </Link>
          </nav>
          <p className="eyebrow" lang={deck.lang}>
            {deck.cover.eyebrow}
          </p>
          <h1 lang={deck.lang}>{deck.title}</h1>
          <p className="lede" lang={deck.lang}>
            {deck.cover.lede}
          </p>
          <DeckByline
            author={deck.author}
            publishedAt={deck.publishedAt}
            updatedAt={deck.updatedAt}
            sourceUrl={deck.sourceUrl}
            zhBody={deck.lang.startsWith("zh")}
          />
          <div className="thesis">
            <span className="eyebrow">
              <Tr k="coreIdea" />
            </span>
            <p lang={deck.lang}>{deck.cover.thesis}</p>
            <div className="ladder" role="list">
              {(
                [
                  ["z-ext", "Untrusted", "External"],
                  ["z-dmz", "Semi-trusted", "DMZ"],
                  ["z-int", "Trusted", "Internal"],
                  ["z-mgmt", "Privileged", "Mgmt"],
                ] as const
              ).map(([z, level, name]) => (
                <div key={z} className={z} role="listitem">
                  <span>{level}</span>
                  <b>{name}</b>
                </div>
              ))}
            </div>
          </div>
          <div className="howto">
            <span>
              <kbd>←</kbd>
              <kbd>→</kbd> <Tr k="howtoKeys" />
            </span>
            <span>
              <Tr k="howtoPages" />
            </span>
            <span>
              <Tr k="howtoCloud" />
            </span>
          </div>
          {first && (
            <Link className="start" href={deckHref(deck.slug, first.slug)}>
              <Tr k="startAt" /> {first.num} <Tr k="startSuffix" />
            </Link>
          )}
        </section>
        <section>
          <div className="grid-head">
            <h2>
              {deck.topics.length} <Tr k="topics" />
            </h2>
            <span className="eyebrow">
              <Tr k="openCardHint" />
            </span>
          </div>
          <div className="tgrid">
            {deck.topics.map((t) => (
              <Link key={t.slug} className="tcard" href={deckHref(deck.slug, t.slug)} prefetch={false}>
                <Svg className="tthumb" markup={t.svg} />
                <div className="tmeta" lang={deck.lang}>
                  <span className="tnum">{t.num}</span>
                  <h3>{t.title}</h3>
                  <p>{t.lede}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </Frame>
  );
}

function topicBar(deck: Deck, t: DeckTopic) {
  return { kind: "topic" as const, num: `${t.num} / ${String(deck.topics.length).padStart(2, "0")}`, title: t.title };
}

export function DeckDiagram({ deck, topic: t }: { deck: Deck; topic: DeckTopic }) {
  const href = deckHref(deck.slug, t.slug);
  const deep = deckHref(deck.slug, t.slug, true);
  return (
    <Frame deck={deck} href={href} current={t.slug} bar={topicBar(deck, t)} views={{ diagram: href, deep, current: "diagram" }} diagram>
      <main className="dpage">
        <div className="stage">
          <div
            className="stage-scroll"
            tabIndex={0}
            role="region"
            aria-label={t.title}
            lang={deck.lang}
            dangerouslySetInnerHTML={{ __html: t.svg }}
          />
          <p className="stage-cap" lang={deck.lang}>
            {t.caption}
          </p>
          <p className="swipe-note">
            <Tr k="swipeNote" />
          </p>
        </div>
        <aside className="panel">
          <div className="panel-in">
            <div className="p-head">
              <p className="eyebrow">
                Topic {t.num} · <Tr k="diagram" />
              </p>
              <h1 lang={deck.lang}>{t.title}</h1>
              <p className="lede" lang={deck.lang}>
                {t.lede}
              </p>
              <ZoneChips zones={t.zones} />
            </div>
            <section className="svc">
              <h2 className="eyebrow">
                <Tr k="keyServices" /> ·{" "}
                {CLOUDS.map((c) => (
                  <span key={c} className={`c-${c}`}>
                    {CLOUD_NAME[c]}
                  </span>
                ))}
              </h2>
              {CLOUDS.map((c) => (
                <dl key={c} className={`c-${c}`} lang={deck.lang}>
                  {t.services[c].map((s) => (
                    <div key={s.name}>
                      <dt>{s.name}</dt>
                      <dd>{s.note}</dd>
                    </div>
                  ))}
                </dl>
              ))}
            </section>
            <section className="sum">
              <h2 className="eyebrow">
                <Tr k="summary" />
              </h2>
              <ul lang={deck.lang}>
                {t.summary.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
            <Link className="cta" href={deep}>
              <span>
                <Tr k="deepDive" />
              </span>
              <small>
                <Tr k="fullExplanation" />
              </small>
            </Link>
          </div>
        </aside>
      </main>
    </Frame>
  );
}

export function DeckDeepDive({ deck, topic: t }: { deck: Deck; topic: DeckTopic }) {
  const diagram = deckHref(deck.slug, t.slug);
  const href = deckHref(deck.slug, t.slug, true);
  return (
    <Frame deck={deck} href={href} current={t.slug} bar={topicBar(deck, t)} views={{ diagram, deep: href, current: "deep" }}>
      <main className="dd">
        <aside className="dd-aside">
          <Link className="thumb" href={diagram}>
            <Svg markup={t.svg} />
            <span>
              <Tr k="backToDiagram" />
            </span>
          </Link>
          <nav className="dd-toc">
            <p className="eyebrow">
              <Tr k="onThisPage" />
            </p>
            <ol lang={deck.lang}>
              {t.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.title}</a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
        <article className="prose" lang={deck.lang}>
          <p className="eyebrow">Topic {t.num} · Deep dive</p>
          <h1>{t.title}</h1>
          <p className="lede">{t.deepLede}</p>
          <div dangerouslySetInnerHTML={{ __html: t.deepHtml }} />
        </article>
      </main>
    </Frame>
  );
}

export function DeckAppendix({ deck }: { deck: Deck }) {
  const a = deck.appendix;
  return (
    <Frame deck={deck} href={deckHref(deck.slug, a.slug)} current="appendix" bar={{ kind: "appendix", title: a.title }}>
      <main className="dd solo">
        <article className="prose">
          <p className="eyebrow">
            <Tr k="appendix" />
          </p>
          <h1 lang={deck.lang}>{a.title}</h1>
          <p className="lede" lang={deck.lang}>
            {a.lede}
          </p>
          <div lang={deck.lang}>
            <Checklist storageKey={`ctp.deck.${deck.slug}.checks`} items={deck.checklist} />
          </div>
          <h2 id="sources">
            <Tr k="references" />
          </h2>
          <ul className="sources">
            {deck.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.name}
                </a>
                <span>{s.note}</span>
              </li>
            ))}
          </ul>
          <p lang={deck.lang}>{a.note}</p>
        </article>
      </main>
    </Frame>
  );
}
