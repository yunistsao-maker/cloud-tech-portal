"use client";

import { FeedSnapshot, type ContentType, type FeedItem } from "@ctp/catalog";
import { useEffect, useState } from "react";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; snapshot: FeedSnapshot };

let cache: Promise<FeedSnapshot> | undefined;

/** The ingest Lambda publishes /data/items.json; the repo ships a snapshot for local dev. */
export function loadSnapshot(): Promise<FeedSnapshot> {
  cache ??= fetch("/data/items.json", { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((json) => FeedSnapshot.parse(json))
    .catch((err) => {
      cache = undefined;
      throw err;
    });
  return cache;
}

export function useFeed(): State {
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    let live = true;
    loadSnapshot().then(
      (snapshot) => live && setState({ status: "ready", snapshot }),
      (err: unknown) => live && setState({ status: "error", message: err instanceof Error ? err.message : String(err) }),
    );
    return () => {
      live = false;
    };
  }, []);
  return state;
}

export interface FeedFilter {
  category?: string;
  capability?: string;
  providers?: Set<FeedItem["provider"]>;
  types?: Set<ContentType>;
  sinceDays?: number;
  now?: Date;
}

export function filterItems(items: FeedItem[], f: FeedFilter): FeedItem[] {
  const now = f.now ?? new Date();
  const since = f.sinceDays ? now.getTime() - f.sinceDays * 86_400_000 : undefined;
  return items.filter(
    (it) =>
      (!f.category || it.categories.includes(f.category)) &&
      (!f.capability || it.capabilities.includes(f.capability)) &&
      (!f.providers || f.providers.has(it.provider)) &&
      (!f.types || f.types.size === 0 || f.types.has(it.type)) &&
      (since === undefined || new Date(it.publishedAt).getTime() >= since),
  );
}

/** Capability ids with at least one item in the last `days`, keyed by provider. */
export function recentlyChanged(items: FeedItem[], days = 90, now = new Date()): Map<string, Set<string>> {
  const since = now.getTime() - days * 86_400_000;
  const map = new Map<string, Set<string>>();
  for (const it of items) {
    if (new Date(it.publishedAt).getTime() < since || it.type === "research") continue;
    for (const c of it.capabilities) {
      if (!map.has(c)) map.set(c, new Set());
      map.get(c)!.add(it.provider);
    }
  }
  return map;
}
