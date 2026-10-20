import { z } from "zod";

/** A run of text with optional marks. */
export const Inline = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  href: z.string().url().optional(),
});
export type Inline = z.infer<typeof Inline>;

const Paragraph = z.object({ type: z.literal("paragraph"), inlines: z.array(Inline) });
const Heading = z.object({ type: z.literal("heading"), level: z.number().int().min(2).max(4), id: z.string(), text: z.string() });
const List = z.object({
  type: z.literal("list"),
  kind: z.enum(["bullet", "ordered", "check"]),
  items: z.array(z.array(z.array(Inline))),
});
const Table = z.object({
  type: z.literal("table"),
  rows: z.array(z.object({ header: z.boolean(), cells: z.array(z.array(z.array(Inline))) })),
});
/** A figure rendered by a component registered for this report (see components/reports). */
const Figure = z.object({ type: z.literal("figure"), ref: z.string(), caption: z.string().optional() });

export const Block = z.discriminatedUnion("type", [Paragraph, Heading, List, Table, Figure]);
export type Block = z.infer<typeof Block>;

export const Report = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  summary: z.object({ en: z.string(), zh: z.string() }),
  author: z.string(),
  publishedAt: z.string().date(),
  /** BCP-47 language of the body. */
  lang: z.string(),
  categories: z.array(z.string()),
  capabilities: z.array(z.string()),
  /** Where the report was written and is maintained. */
  sourceUrl: z.string().url(),
  blocks: z.array(Block),
});
export type Report = z.infer<typeof Report>;
