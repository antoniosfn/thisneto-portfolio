import { useContext } from "react";
import { content } from "@/content";
import type { SiteContent } from "@/content";
import { LanguageContext, type LanguageContextValue } from "@/context/language-context";

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage deve ser usado dentro de LanguageProvider");
  return context;
};

/** Conteúdo do idioma ativo. */
export const useContent = (): SiteContent => content[useLanguage().language];
