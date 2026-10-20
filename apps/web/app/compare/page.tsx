import type { Metadata } from "next";
import { Suspense } from "react";
import { ComparePage } from "@/components/ComparePage";

export const metadata: Metadata = { title: "Compare" };

export default function Compare() {
  // useSearchParams needs a Suspense boundary in a static export.
  return (
    <Suspense>
      <ComparePage />
    </Suspense>
  );
}
