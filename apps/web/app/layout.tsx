import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { PREFS_BOOT_SCRIPT, PrefsProvider } from "@/lib/prefs";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "cloud/pulse", template: "%s · cloud/pulse" },
  description: "AWS, Azure and Google Cloud announcements, engineering posts and research, with side-by-side service comparison.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-sky="white" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Noto+Sans+TC:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <PrefsProvider>
          <Shell>{children}</Shell>
        </PrefsProvider>
      </body>
    </html>
  );
}
