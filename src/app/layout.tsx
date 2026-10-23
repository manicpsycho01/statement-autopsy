import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import { SmoothScroll } from "@/components/SmoothScroll";
import "./globals.css";

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jet = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jet" });

const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3200";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: "Statement Autopsy — find where your money leaks",
  description:
    "Drop your Indian bank statement (CSV, Excel or PDF) and get a plain-English report of forgotten subscriptions, bank fees, double charges and spending habits — with what to do about each. Runs on your device; nothing is uploaded.",
  openGraph: { title: "Statement Autopsy", description: "Find where your money leaks — privately, in seconds.", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f5f3ee" }, { media: "(prefers-color-scheme: dark)", color: "#141412" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${serif.variable} ${inter.variable} ${jet.variable}`}>
      <body>
        <a href="#main" className="label fixed top-3 left-3 z-50 -translate-y-24 rounded-full bg-ink px-4 py-3 text-paper focus-visible:translate-y-0">
          Skip to content
        </a>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
