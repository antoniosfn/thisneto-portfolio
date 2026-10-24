import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../src/landing/landing.css";

export const metadata: Metadata = {
  title: "Antonio Neto | IA e software para empresas",
  description:
    "Matemática, inteligência artificial e engenharia de software aplicadas aos desafios da sua empresa. Conheça minha trajetória e meus projetos.",
  openGraph: {
    title: "Antonio Neto | IA e software para empresas",
    description:
      "Da lógica ao código. Do código ao que importa para o seu negócio.",
    locale: "pt_BR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="theme-color" content="#000000" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link
          rel="preload"
          href="/fonts/space-grotesk.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
