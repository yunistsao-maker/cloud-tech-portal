import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportBody } from "@/components/reports/ReportBody";
import { ReportAside, ReportHeader } from "@/components/reports/ReportChrome";
import { getReport, reports } from "@/lib/reports";

export const dynamicParams = false;

export function generateStaticParams() {
  return reports.map((r) => ({ slug: r.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = getReport((await params).slug);
  return r ? { title: r.title, description: r.summary.en } : {};
}

export default async function ReportPage({ params }: Props) {
  const report = getReport((await params).slug);
  if (!report) notFound();
  return (
    <div className="flex flex-col gap-8">
      <ReportHeader report={report} />
      <div className="flex flex-wrap items-start gap-10">
        {/* The body is rendered on the server so the full text is in the static HTML. */}
        <article lang={report.lang} className="min-w-0 max-w-[820px] flex-[999_1_560px]">
          <ReportBody blocks={report.blocks} />
        </article>
        <aside className="flex w-full flex-col gap-4 md:sticky md:top-6 md:max-h-[calc(100vh-3rem)] md:w-auto md:max-w-[320px] md:flex-[1_1_260px] md:overflow-y-auto">
          <ReportAside report={report} />
        </aside>
      </div>
    </div>
  );
}
