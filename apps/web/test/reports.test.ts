import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getCapability, getCategory } from "@ctp/catalog";
import { describe, expect, it } from "vitest";
import { reports } from "../lib/reports";
import { convert } from "../scripts/import-doc";

describe("reports", () => {
  it("point at real catalog categories and capabilities", () => {
    for (const r of reports) {
      for (const c of r.categories) expect(getCategory(c), `${r.slug}: ${c}`).toBeDefined();
      for (const c of r.capabilities) expect(getCapability(c), `${r.slug}: ${c}`).toBeDefined();
    }
  });

  it("only use figures the renderer knows", () => {
    const source = readFileSync(join(__dirname, "../components/reports/ReportBody.tsx"), "utf8");
    for (const r of reports)
      for (const b of r.blocks) if (b.type === "figure") expect(source, `${r.slug}: figure ${b.ref}`).toContain(`"${b.ref}"`);
  });

  it("give every heading a unique anchor", () => {
    for (const r of reports) {
      const ids = r.blocks.flatMap((b) => (b.type === "heading" ? [b.id] : []));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("import-doc warnings", () => {
  it("reports elements it cannot render instead of dropping them silently", () => {
    const r = convert(
      `<doc><paragraph id='a'><text id='b'><italic>slanted</italic></text></paragraph><callout id='c'><text id='d'>x</text></callout></doc>`,
    );
    expect(r.blocks).toEqual([{ type: "paragraph", inlines: [{ text: "slanted" }] }]);
    expect(r.warnings).toEqual(["inline <italic> rendered as plain text", "top-level <callout> skipped"]);
  });
});

describe("import-doc convert", () => {
  const xml = `<doc node='n'><paragraph id='a' heading='1'><text id='b'>My Survey</text></paragraph>
<paragraph id='c'><date id='d' value='2026-10-20'/><text id='e'> · </text><mention id='f' user='u' name='Eunice Tsao'/></paragraph>
<paragraph id='g' heading='2'><text id='h'>市場 Market &amp; Trends</text></paragraph>
<paragraph id='i'><text id='j'><bold>結論：</bold></text><text id='k'>see </text><text id='l'><link href='https://example.com/a'>source</link></text><text id='l2'> run </text><text id='l3'><code>/aidlc &lt;profile&gt;</code></text></paragraph>
<list id='m' kind='check'><listItem id='n'><paragraph id='o'><text id='p'>do it</text></paragraph></listItem></list>
<list id='m2' kind='bullet'><listItem id='n2'><paragraph id='o2'><text id='p2'>parent</text></paragraph><list id='m3' kind='bullet'><listItem id='n3'><paragraph id='o3'><text id='p3'>child</text></paragraph></listItem></list></listItem></list>
<table id='q'><row id='r'><cell id='s' header='true'><paragraph id='t'><text id='u'>H</text></paragraph></cell></row><row id='v'><cell id='w'><paragraph id='x'><text id='y'>1</text></paragraph><paragraph id='z'><text id='za'>2</text></paragraph></cell></row></table>
<embed id='e1' caption='roadmap' ref='node/abc-123'/></doc>`;

  it("pulls title, byline and blocks with marks", () => {
    const r = convert(xml);
    expect(r).toMatchObject({ title: "My Survey", author: "Eunice Tsao", date: "2026-10-20" });
    expect(r.blocks[0]).toEqual({ type: "heading", level: 2, id: "市場-market-and-trends", text: "市場 Market & Trends" });
    expect(r.blocks[1]).toEqual({
      type: "paragraph",
      inlines: [
        { text: "結論：", bold: true },
        { text: "see " },
        { text: "source", href: "https://example.com/a" },
        { text: " run " },
        { text: "/aidlc <profile>", code: true },
      ],
    });
    expect(r.blocks[2]).toEqual({ type: "list", kind: "check", items: [{ paras: [[{ text: "do it" }]] }] });
    expect(r.blocks.splice(3, 1)[0]).toEqual({
      type: "list",
      kind: "bullet",
      items: [
        {
          paras: [[{ text: "parent" }]],
          lists: [{ type: "list", kind: "bullet", items: [{ paras: [[{ text: "child" }]] }] }],
        },
      ],
    });
    expect(r.warnings).toEqual([]);
    expect(r.blocks[3]).toEqual({
      type: "table",
      rows: [
        { header: true, cells: [[[{ text: "H" }]]] },
        { header: false, cells: [[[{ text: "1" }], [{ text: "2" }]]] },
      ],
    });
    expect(r.blocks[4]).toEqual({ type: "figure", ref: "abc-123", caption: "roadmap" });
  });
});
