/**
 * Convert a Claude Docs tab (the XML its connector returns) into a portal report.
 *
 *   npx tsx scripts/import-doc.ts <tab.xml> <meta.json> > content/reports/<slug>.json
 *
 * meta.json holds the fields the doc does not: slug, summary, categories,
 * capabilities, sourceUrl, lang. Title, author and date are read from the doc.
 * meta.json may also set updatedAt when re-importing a revised doc.
 * Embeds become `figure` blocks keyed by their node ref; register a component
 * for each in components/reports/ReportBody.tsx.
 * Anything the converter does not understand is listed on stderr.
 */
import { readFileSync } from "node:fs";
import { XMLParser } from "fast-xml-parser";
import { Report, type Block, type Inline, type ListBlock } from "../lib/report-schema";

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
    else if (t === "code") out.push(...inlines(kids(n), { ...marks, code: true }));
    else if (t === "link") out.push(...inlines(kids(n), { ...marks, href: attr(n, "href") }));
    else {
      // <text> is a plain wrapper; anything else is a mark this importer does not render yet.
      if (t !== "text") warn(`inline <${t}> rendered as plain text`);
      out.push(...inlines(kids(n), marks));
    }
  }
  // Merge neighbours with identical marks so the renderer emits fewer spans.
  return out.reduce<Inline[]>((acc, cur) => {
    const prev = acc[acc.length - 1];
    if (prev && prev.bold === cur.bold && prev.code === cur.code && prev.href === cur.href) prev.text += cur.text;
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

/** Unknown elements are reported, never silently dropped. */
const warnings: string[] = [];
function warn(msg: string) {
  if (!warnings.includes(msg)) warnings.push(msg);
}

function paragraphsIn(n: Node, where: string): Inline[][] {
  return kids(n).flatMap((c) => {
    const t = tag(c);
    if (t === "paragraph") return [inlines(kids(c))];
    if (t !== "#text") warn(`<${t}> inside ${where} skipped`);
    return [];
  });
}

function listFrom(n: Node): ListBlock {
  return {
    type: "list",
    kind: (attr(n, "kind") ?? "bullet") as ListBlock["kind"],
    items: kids(n)
      .filter((c) => tag(c) === "listItem")
      .map((item) => {
        const paras: Inline[][] = [];
        const lists: ListBlock[] = [];
        for (const c of kids(item)) {
          const t = tag(c);
          if (t === "paragraph") paras.push(inlines(kids(c)));
          else if (t === "list") lists.push(listFrom(c));
          else if (t !== "#text") warn(`<${t}> inside a list item skipped`);
        }
        return lists.length ? { paras, lists } : { paras };
      }),
  };
}

export function convert(xml: string) {
  const root = (parser.parse(xml) as Node[]).find((n) => tag(n) === "doc");
  if (!root) throw new Error("no <doc> element");
  warnings.length = 0;
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
      blocks.push(listFrom(n));
    } else if (t === "table") {
      blocks.push({
        type: "table",
        rows: kids(n)
          .filter((r) => tag(r) === "row")
          .map((r) => {
            const cells = kids(r).filter((c) => tag(c) === "cell");
            return { header: cells.every((c) => attr(c, "header") === "true"), cells: cells.map((c) => paragraphsIn(c, "a table cell")) };
          }),
      });
    } else if (t === "embed") {
      blocks.push({ type: "figure", ref: (attr(n, "ref") ?? "").replace(/^node\//, ""), caption: attr(n, "caption") });
    } else if (t !== "#text") warn(`top-level <${t}> skipped`);
  }
  return { title, author, date, blocks, warnings: [...warnings] };
}

if (process.argv[1]?.endsWith("import-doc.ts")) {
  const [xmlPath, metaPath] = process.argv.slice(2);
  if (!xmlPath || !metaPath) {
    console.error("usage: tsx scripts/import-doc.ts <tab.xml> <meta.json>");
    process.exit(1);
  }
  const { title, author, date, blocks, warnings: notes } = convert(readFileSync(xmlPath, "utf8"));
  for (const n of notes) console.error(`warning: ${n}`);
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  const report = Report.parse({ title, author, publishedAt: date, ...meta, blocks });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
