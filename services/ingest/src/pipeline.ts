import type { FeedItem, FeedSnapshot, Tagger } from "@ctp/catalog";
import { categoriesFor, classify, type Draft } from "./classify";
import { parseFeed } from "./parse";
import type { Source } from "./sources";
import type { Store } from "./store";
import type { Summarizer } from "./summarize";

export interface IngestOptions {
  sources: Source[];
  fetchText: (url: string) => Promise<string>;
  store: Store;
  tagger: Tagger;
  summarizer: Summarizer;
  /** False for the no-op summariser: store everything without waiting for summaries. */
  summariesEnabled: boolean;
  /** Model calls allowed per run; new items beyond it wait for the next run. */
  maxSummaries?: number;
  snapshotSize?: number;
  now?: () => Date;
  log?: (msg: string) => void;
}

export interface SourceReport {
  sourceId: string;
  entries: number;
  kept: number;
  error?: string;
}

export interface IngestReport {
  sources: SourceReport[];
  newItems: number;
  summarised: number;
  summaryFailures: number;
  deferred: number;
  snapshot: FeedSnapshot;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function runIngest(opts: IngestOptions): Promise<IngestReport> {
  const log = opts.log ?? (() => {});
  const maxSummaries = opts.maxSummaries ?? 40;

  const perSource = await mapLimit(opts.sources, 4, async (source) => {
    const report: SourceReport = { sourceId: source.id, entries: 0, kept: 0 };
    try {
      const entries = parseFeed(await opts.fetchText(source.url), source);
      report.entries = entries.length;
      const drafts = entries.map((e) => classify(e, source, opts.tagger)).filter((d): d is Draft => !!d);
      report.kept = drafts.length;
      return { report, drafts };
    } catch (err) {
      report.error = err instanceof Error ? err.message : String(err);
      log(`source ${source.id} failed: ${report.error}`);
      return { report, drafts: [] as Draft[] };
    }
  });

  const byId = new Map<string, Draft>();
  for (const { drafts } of perSource) for (const d of drafts) if (!byId.has(d.item.id)) byId.set(d.item.id, d);
  const seen = await opts.store.existing([...byId.keys()]);
  const fresh = [...byId.values()]
    .filter((d) => !seen.has(d.item.id))
    .sort((a, b) => b.item.publishedAt.localeCompare(a.item.publishedAt));

  const toStore = opts.summariesEnabled ? fresh.slice(0, maxSummaries) : fresh;
  const deferred = fresh.length - toStore.length;
  let summarised = 0;
  let summaryFailures = 0;

  const finished = await mapLimit(toStore, 3, async (draft): Promise<FeedItem> => {
    if (!opts.summariesEnabled) return draft.item;
    try {
      const res = await opts.summarizer.summarize({
        title: draft.item.title,
        body: draft.body,
        sourceName: draft.item.sourceName,
        candidates: draft.candidates,
      });
      if (!res) {
        summaryFailures++;
        return draft.item;
      }
      summarised++;
      const caps = res.capabilities.length ? res.capabilities : draft.item.capabilities;
      return {
        ...draft.item,
        summary: res.summary,
        capabilities: caps,
        categories: categoriesFor(caps),
        // The feed's own wording beats the model's reading of it.
        ...(draft.item.status ?? res.status ? { status: draft.item.status ?? res.status } : {}),
      };
    } catch (err) {
      summaryFailures++;
      log(`summary failed for ${draft.item.url}: ${err instanceof Error ? err.message : String(err)}`);
      return draft.item;
    }
  });

  for (const item of finished) await opts.store.put(item);

  const items = await opts.store.latest(opts.snapshotSize ?? 400);
  return {
    sources: perSource.map((p) => p.report),
    newItems: finished.length,
    summarised,
    summaryFailures,
    deferred,
    snapshot: { generatedAt: (opts.now?.() ?? new Date()).toISOString(), items },
  };
}

export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "cloud-tech-portal/0.1 (+feed reader)", accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}
