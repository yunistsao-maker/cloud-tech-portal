import type { Metadata } from "next";
import { ReportsIndex } from "@/components/reports/ReportChrome";

export const metadata: Metadata = { title: "Reports" };

export default function Reports() {
  return <ReportsIndex />;
}
