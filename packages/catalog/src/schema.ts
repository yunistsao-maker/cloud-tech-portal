import { z } from "zod";

export const PROVIDERS = ["aws", "azure", "gcp"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABEL: Record<Provider, string> = {
  aws: "AWS",
  azure: "Azure",
  gcp: "Google Cloud",
};

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be a lower-case slug");

export const Localized = z.object({
  en: z.string().min(1),
  zh: z.string().min(1),
});
export type Localized = z.infer<typeof Localized>;

export const Category = z.object({
  id: slug,
  name: Localized,
});
export type Category = z.infer<typeof Category>;

export const Service = z.object({
  name: z.string().min(1),
  /** Names this service was sold under before; search resolves them. */
  formerly: z.array(z.string().min(1)).optional(),
  /** Other names, sub-features and acronyms that identify the service. */
  aliases: z.array(z.string().min(1)).optional(),
  docsUrl: z.string().url().optional(),
});
export type Service = z.infer<typeof Service>;

export const Attribute = z.object({
  label: Localized,
  values: z.object({ aws: z.string(), azure: z.string(), gcp: z.string() }),
  /** Set when a value still needs an SA to confirm it against current docs. */
  needsReview: z.boolean().optional(),
});
export type Attribute = z.infer<typeof Attribute>;

export const Capability = z.object({
  id: slug,
  category: slug,
  name: Localized,
  keywords: z.array(z.string().min(2)).default([]),
  services: z.object({
    aws: z.array(Service),
    azure: z.array(Service),
    gcp: z.array(Service),
  }),
  attributes: z.array(Attribute).optional(),
});
export type Capability = z.infer<typeof Capability>;

export const CONTENT_TYPES = ["announcement", "blog", "news", "research", "event", "lifecycle"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const STATUSES = ["ga", "preview", "deprecated", "renamed"] as const;
export type Status = (typeof STATUSES)[number];

export const FeedItem = z.object({
  /** sha256 of the canonical URL, hex. */
  id: z.string().min(8),
  url: z.string().url(),
  title: z.string().min(1),
  sourceId: z.string().min(1),
  sourceName: z.string().min(1),
  provider: z.enum([...PROVIDERS, "independent"]),
  type: z.enum(CONTENT_TYPES),
  publishedAt: z.string().datetime({ offset: true }),
  capabilities: z.array(z.string()),
  categories: z.array(z.string()),
  status: z.enum(STATUSES).optional(),
  summary: Localized.optional(),
  /** Hand-written sample data shipped with the repo, not from a live feed. */
  seed: z.boolean().optional(),
});
export type FeedItem = z.infer<typeof FeedItem>;

export const FeedSnapshot = z.object({
  generatedAt: z.string().datetime({ offset: true }),
  items: z.array(FeedItem),
});
export type FeedSnapshot = z.infer<typeof FeedSnapshot>;
