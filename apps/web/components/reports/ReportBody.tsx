import type { ComponentType, ReactNode } from "react";
import type { Block, Inline, ListBlock, ListItem } from "@/lib/report-schema";
import { RoadmapFigure } from "./RoadmapFigure";

/** Figures referenced by `figure` blocks, keyed by the source doc's embed node id. */
const FIGURES: Record<string, ComponentType> = {
  "0c77155c-215c": RoadmapFigure,
};

function Inlines({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) => {
        let text: ReactNode = p.text;
        if (p.code) text = <code className="rounded bg-raised px-1.5 py-0.5 font-mono text-[0.88em] text-strong">{text}</code>;
        if (p.bold) text = <strong className="font-semibold text-strong">{text}</strong>;
        return p.href ? (
          <a key={i} href={p.href} target="_blank" rel="noreferrer" className="text-strong underline decoration-control underline-offset-2">
            {text}
          </a>
        ) : (
          <span key={i}>{text}</span>
        );
      })}
    </>
  );
}

function Paragraphs({ paras }: { paras: Inline[][] }) {
  return (
    <>
      {paras.map((p, i) => (
        <p key={i} className={i ? "mt-1.5" : undefined}>
          <Inlines parts={p} />
        </p>
      ))}
    </>
  );
}

function ItemContent({ item }: { item: ListItem }) {
  return (
    <>
      <Paragraphs paras={item.paras} />
      {item.lists?.map((sub, k) => (
        <div key={k} className="mt-2">
          <ListView list={sub} nested />
        </div>
      ))}
    </>
  );
}

function ListView({ list, nested }: { list: ListBlock; nested?: boolean }) {
  if (list.kind === "check") {
    return (
      <ul className="flex flex-col gap-2">
        {list.items.map((item, j) => (
          <li key={j} className="flex gap-3">
            <span aria-hidden="true" className="mt-[0.45em] size-4 shrink-0 rounded border-2 border-control" />
            <div>
              <ItemContent item={item} />
            </div>
          </li>
        ))}
      </ul>
    );
  }
  const Tag = list.kind === "ordered" ? "ol" : "ul";
  const marker = list.kind === "ordered" ? "list-decimal" : nested ? "list-[circle]" : "list-disc";
  return (
    <Tag className={`flex flex-col gap-2 pl-6 ${marker} marker:text-muted`}>
      {list.items.map((item, j) => (
        <li key={j} className="pl-1">
          <ItemContent item={item} />
        </li>
      ))}
    </Tag>
  );
}

const HEADING_CLASS = {
  2: "mt-12 scroll-mt-6 border-t border-border pt-8 text-2xl font-semibold tracking-tight first:mt-0 first:border-0 first:pt-0",
  3: "mt-8 scroll-mt-6 text-lg font-semibold",
  4: "mt-6 scroll-mt-6 font-semibold",
} as const;

export function ReportBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-4 text-[16px] leading-[1.8] text-text">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "heading": {
            const Tag = `h${b.level}` as "h2" | "h3" | "h4";
            return (
              <Tag key={i} id={b.id} className={HEADING_CLASS[b.level as 2 | 3 | 4]}>
                {b.text}
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p key={i}>
                <Inlines parts={b.inlines} />
              </p>
            );
          case "list":
            return <ListView key={i} list={b} />;
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[560px] border-collapse text-[14px] leading-relaxed">
                  <tbody>
                    {b.rows.map((row, r) => (
                      <tr key={r} className={row.header ? "bg-raised" : "border-t border-line"}>
                        {row.cells.map((cell, c) => {
                          const Cell = row.header ? "th" : "td";
                          return (
                            <Cell
                              key={c}
                              scope={row.header ? "col" : undefined}
                              className={`px-3.5 py-2.5 text-left align-top ${row.header ? "font-semibold text-strong" : ""}`}
                            >
                              <Paragraphs paras={cell} />
                            </Cell>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "figure": {
            const Figure = FIGURES[b.ref];
            return (
              <figure key={i} className="rounded-xl border border-border bg-surface p-4">
                {Figure ? <Figure /> : <div className="p-6 text-center text-muted">[Figure {b.ref} not registered]</div>}
                {b.caption && <figcaption className="mt-2 font-mono text-xs text-muted">{b.caption}</figcaption>}
              </figure>
            );
          }
        }
      })}
    </div>
  );
}
