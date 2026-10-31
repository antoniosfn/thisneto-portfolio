import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../src/landing/landing.css";

export const metadata: Metadata = {
  title: "Antonio Neto | IA, automação e software",
  description:
    "IA e software para automatizar tarefas, conectar sistemas e encontrar respostas nos seus dados — fale sobre seu projeto com Antonio Neto",
  openGraph: {
    title: "Antonio Neto | IA, automação e software",
    description:
      "Menos tarefas, mais tempo para crescer — IA e software para automatizar rotinas e conectar seus dados",
    locale: "pt_BR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // Browser extensions (e.g. Grabit) inject attributes on <html> before React
    // hydrates; this ignores mismatches on this element's own attributes only.
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#000000" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link
          rel="preload"
          href="/fonts/manrope.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Without JavaScript nothing loads behind the loading screen: skip it. */}
        <noscript>
          <style>{".site-loader{display:none}"}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
