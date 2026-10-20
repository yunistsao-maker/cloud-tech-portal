/**
 * Convert a Claude Docs tab (the XML its connector returns) into a portal report.
 *
 *   npx tsx scripts/import-doc.ts <tab.xml> <meta.json> > content/reports/<slug>.json
 *
 * meta.json holds the fields the doc does not: slug, summary, categories,
 * capabilities, sourceUrl, lang. Title, author and date are read from the doc.
 * Embeds become `figure` blocks keyed by their node ref; register a component
 * for each in components/reports/figures.tsx.
 */
import { readFileSync } from "node:fs";
import { XMLParser } from "fast-xml-parser";
import { Report, type Block, type Inline } from "../lib/report-schema";

type Node = Record<string, unknown> & { ":@"?: Record<string, string> };

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: false,
  processEntities: true,
});

function tag(n: Node): string {
  return Object.keys(n).find((k) => k !== ":@")!;
}
function kids(n: Node): Node[] {
  return (n[tag(n)] as Node[]) ?? [];
}
function attr(n: Node, k: string): string | undefined {
  return n[":@"]?.[k];
}

function inlines(nodes: Node[], marks: Omit<Inline, "text"> = {}): Inline[] {
  const out: Inline[] = [];
  for (const n of nodes) {
    const t = tag(n);
    if (t === "#text") {
      const text = String(n["#text"]);
      if (text) out.push({ text, ...marks });
    } else if (t === "bold") out.push(...inlines(kids(n), { ...marks, bold: true }));
    else if (t === "link") out.push(...inlines(kids(n), { ...marks, href: attr(n, "href") }));
    else out.push(...inlines(kids(n), marks)); // <text> and anything unknown: keep its words
  }
  // Merge neighbours with identical marks so the renderer emits fewer spans.
  return out.reduce<Inline[]>((acc, cur) => {
    const prev = acc[acc.length - 1];
    if (prev && prev.bold === cur.bold && prev.href === cur.href) prev.text += cur.text;
    else acc.push({ ...cur });
    return acc;
  }, []);
}

const plain = (ins: Inline[]) => ins.map((i) => i.text).join("");

function slugify(s: string, used: Set<string>): string {
  // Keep CJK so Chinese-only headings still get readable anchors.
  let base = s.toLowerCase().replace(/&/g, "and").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "section";
  let id = base;
  for (let i = 2; used.has(id); i++) id = `${base}-${i}`;
  used.add(id);
  return id;
}

function paragraphsIn(n: Node): Inline[][] {
  return kids(n)
    .filter((c) => tag(c) === "paragraph")
    .map((p) => inlines(kids(p)));
}

export function convert(xml: string) {
  const root = (parser.parse(xml) as Node[]).find((n) => tag(n) === "doc");
  if (!root) throw new Error("no <doc> element");
  const blocks: Block[] = [];
  const used = new Set<string>();
  let title = "";
  let author = "";
  let date = "";

  for (const n of kids(root)) {
    const t = tag(n);
    if (t === "paragraph") {
      const heading = attr(n, "heading");
      const parts = kids(n);
      const date_ = parts.find((p) => tag(p) === "date");
      const mention = parts.find((p) => tag(p) === "mention");
      if (date_ || mention) {
        // The byline paragraph: "<date> · <mention>".
        date = attr(date_ ?? {}, "value") ?? date;
        author = attr(mention ?? {}, "name") ?? author;
        continue;
      }
      const ins = inlines(parts);
      if (heading === "1") {
        title = plain(ins);
        continue;
      }
      if (heading) {
        const text = plain(ins);
        blocks.push({ type: "heading", level: Math.min(Math.max(Number(heading), 2), 4), id: slugify(text, used), text });
      } else if (plain(ins).trim()) blocks.push({ type: "paragraph", inlines: ins });
    } else if (t === "list") {
      const kind = (attr(n, "kind") ?? "bullet") as "bullet" | "ordered" | "check";
      blocks.push({ type: "list", kind, items: kids(n).filter((c) => tag(c) === "listItem").map(paragraphsIn) });
    } else if (t === "table") {
      blocks.push({
        type: "table",
        rows: kids(n)
          .filter((r) => tag(r) === "row")
          .map((r) => {
            const cells = kids(r).filter((c) => tag(c) === "cell");
            return { header: cells.every((c) => attr(c, "header") === "true"), cells: cells.map(paragraphsIn) };
          }),
      });
    } else if (t === "embed") {
      blocks.push({ type: "figure", ref: (attr(n, "ref") ?? "").replace(/^node\//, ""), caption: attr(n, "caption") });
    }
  }
  return { title, author, date, blocks };
}

if (process.argv[1]?.endsWith("import-doc.ts")) {
  const [xmlPath, metaPath] = process.argv.slice(2);
  if (!xmlPath || !metaPath) {
    console.error("usage: tsx scripts/import-doc.ts <tab.xml> <meta.json>");
    process.exit(1);
  }
  const { title, author, date, blocks } = convert(readFileSync(xmlPath, "utf8"));
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  const report = Report.parse({ title, author, publishedAt: date, ...meta, blocks });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
