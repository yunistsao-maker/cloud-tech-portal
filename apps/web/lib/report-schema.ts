import { z } from "zod";

/** A run of text with optional marks. */
export const Inline = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  code: z.boolean().optional(),
  href: z.string().url().optional(),
});
export type Inline = z.infer<typeof Inline>;

const Paragraph = z.object({ type: z.literal("paragraph"), inlines: z.array(Inline) });
const Heading = z.object({ type: z.literal("heading"), level: z.number().int().min(2).max(4), id: z.string(), text: z.string() });
export interface ListBlock {
  type: "list";
  kind: "bullet" | "ordered" | "check";
  items: ListItem[];
}
/** An item's paragraphs, then any sub-lists nested under it. */
export interface ListItem {
  paras: Inline[][];
  lists?: ListBlock[];
}
const List: z.ZodType<ListBlock> = z.lazy(() =>
  z.object({
    type: z.literal("list"),
    kind: z.enum(["bullet", "ordered", "check"]),
    items: z.array(z.object({ paras: z.array(z.array(Inline)), lists: z.array(List).optional() })),
  }),
);
const Table = z.object({
  type: z.literal("table"),
  rows: z.array(z.object({ header: z.boolean(), cells: z.array(z.array(z.array(Inline))) })),
});
/** A figure rendered by a component registered for this report (see components/reports). */
const Figure = z.object({ type: z.literal("figure"), ref: z.string(), caption: z.string().optional() });

export const Block = z.union([Paragraph, Heading, List, Table, Figure]);
export type Block =
  | z.infer<typeof Paragraph>
  | z.infer<typeof Heading>
  | ListBlock
  | z.infer<typeof Table>
  | z.infer<typeof Figure>;

export const Report = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  summary: z.object({ en: z.string(), zh: z.string() }),
  author: z.string(),
  publishedAt: z.string().date(),
  /** Last time the content was re-imported from a changed source doc. */
  updatedAt: z.string().date().optional(),
  /** BCP-47 language of the body. */
  lang: z.string(),
  categories: z.array(z.string()),
  capabilities: z.array(z.string()),
  /** Where the report was written and is maintained. */
  sourceUrl: z.string().url(),
  blocks: z.array(Block),
});
export type Report = Omit<z.infer<typeof Report>, "blocks"> & { blocks: Block[] };
