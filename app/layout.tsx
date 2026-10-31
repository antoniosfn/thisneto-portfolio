import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Barlow_Condensed, IBM_Plex_Mono, Inter } from "next/font/google";
import "../src/landing/landing.css";
import { SITE_URL } from "./site";

// Precision-tool direction: condensed display, neutral body, mono metadata.
const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  title: "Antonio Neto | IA, automação e software",
  description:
    "IA e software para automatizar tarefas, conectar sistemas e encontrar respostas nos seus dados — fale sobre seu projeto com Antonio Neto",
  openGraph: {
    title: "Antonio Neto | IA, automação e software",
    description:
      "Menos tarefas, mais tempo para crescer — IA e software para automatizar rotinas e conectar seus dados",
    url: "/",
    siteName: "Antonio Neto",
    locale: "pt_BR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // Browser extensions (e.g. Grabit) inject attributes on <html> before React
    // hydrates; this ignores mismatches on this element's own attributes only.
    <html
      lang="pt-BR"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#e5e7eb" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {/* Without JavaScript nothing loads behind the loading screen: skip it. */}
        <noscript>
          <style>{".site-loader{display:none}"}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
