import type { FeedItem } from "@ctp/catalog";
import type { Store } from "./store";

const DAY_MS = 86_400_000;
/** Most items read for one snapshot: far above any real 14-day window, but bounds a misconfigured one. */
const READ_CAP = 20_000;

export interface SnapshotWindow {
  now: Date;
  /** Days of history to publish. */
  days: number;
  /** Most items to publish; over it, the busiest feeds give up their oldest items first. */
  max: number;
  /** Fewest items to publish: when the window holds fewer (a long outage), the newest items stand in. */
  min: number;
}

const newestFirst = (a: FeedItem, b: FeedItem) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id);

/**
 * The items the site shows: everything published in the last `days`, so a burst on one
 * feed (AWS What's New before re:Invent) can no longer push quieter feeds out of the window.
 */
export async function selectSnapshot(store: Store, w: SnapshotWindow): Promise<FeedItem[]> {
  const since = new Date(w.now.getTime() - w.days * DAY_MS).toISOString();
  // Read the whole window, not just the newest `max`: the trim must see the quiet feeds to protect them.
  let items = await store.latest(READ_CAP, since);
  if (items.length < w.min) items = await store.latest(w.min);
  return balanceBySource(items, w.max);
}

/**
 * Cuts `items` to `max` with one quota per source, set as high as the total allows:
 * feeds under the quota keep everything, the busiest feeds lose their oldest items.
 */
export function balanceBySource(items: FeedItem[], max: number): FeedItem[] {
  const sorted = [...items].sort(newestFirst);
  if (sorted.length <= max) return sorted;

  const groups = new Map<string, FeedItem[]>();
  for (const it of sorted) {
    const group = groups.get(it.sourceId);
    if (group) group.push(it);
    else groups.set(it.sourceId, [it]);
  }

  // Water-filling: the smallest feeds fit whole; the quota is what is left, shared by the rest.
  const sizes = [...groups.values()].map((g) => g.length).sort((a, b) => a - b);
  let left = max;
  let quota = 0;
  for (let i = 0; i < sizes.length; i++) {
    const share = Math.floor(left / (sizes.length - i));
    if (sizes[i]! > share) {
      quota = share;
      break;
    }
    left -= sizes[i]!;
  }

  const kept: FeedItem[] = [];
  const spill: FeedItem[] = [];
  for (const group of groups.values()) {
    kept.push(...group.slice(0, quota));
    spill.push(...group.slice(quota));
  }
  // Rounding the quota down leaves a few free slots; the newest trimmed items take them.
  kept.push(...spill.sort(newestFirst).slice(0, max - kept.length));
  return kept.sort(newestFirst);
}
