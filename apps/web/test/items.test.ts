import type { FeedItem } from "@ctp/catalog";
import { describe, expect, it } from "vitest";
import { filterItems, recentlyChanged } from "../lib/items";

const item = (over: Partial<FeedItem>): FeedItem => ({
  id: Math.random().toString(16).slice(2, 12),
  url: "https://example.com/x",
  title: "x",
  sourceId: "s",
  sourceName: "S",
  provider: "aws",
  type: "announcement",
  publishedAt: "2026-10-19T00:00:00.000Z",
  capabilities: [],
  categories: [],
  ...over,
});

const now = new Date("2026-10-20T00:00:00Z");

describe("filterItems", () => {
  const items = [
    item({ provider: "aws", categories: ["ai-ml"], capabilities: ["agent-runtime"] }),
    item({ provider: "azure", categories: ["database"], type: "lifecycle" }),
    item({ provider: "gcp", publishedAt: "2026-09-01T00:00:00.000Z" }),
  ];

  it("filters by category, capability, provider, type and age", () => {
    expect(filterItems(items, { category: "ai-ml", now })).toHaveLength(1);
    expect(filterItems(items, { capability: "agent-runtime", now })).toHaveLength(1);
    expect(filterItems(items, { providers: new Set(["azure", "gcp"]), now })).toHaveLength(2);
    expect(filterItems(items, { types: new Set(["lifecycle"]), now })).toHaveLength(1);
    expect(filterItems(items, { sinceDays: 7, now })).toHaveLength(2);
  });

  it("treats an empty type set as no type filter", () => {
    expect(filterItems(items, { types: new Set(), now })).toHaveLength(3);
  });
});

describe("recentlyChanged", () => {
  it("marks capability per provider, ignoring research and old items", () => {
    const map = recentlyChanged(
      [
        item({ provider: "aws", capabilities: ["kubernetes"] }),
        item({ provider: "independent", type: "research", capabilities: ["kubernetes"] }),
        item({ provider: "gcp", capabilities: ["kubernetes"], publishedAt: "2026-01-01T00:00:00.000Z" }),
      ],
      90,
      now,
    );
    expect([...(map.get("kubernetes") ?? [])]).toEqual(["aws"]);
  });
});
