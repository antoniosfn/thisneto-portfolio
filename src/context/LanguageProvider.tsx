import { useCallback, useEffect, useMemo, useState } from "react";
import { content } from "@/content";
import type { Language } from "@/content";
import {
  LANGUAGE_STORAGE_KEY,
  LanguageContext,
  type LanguageContextValue,
} from "./language-context";

const isLanguage = (value: unknown): value is Language => value === "pt" || value === "en";

const resolveInitialLanguage = (): Language => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    // localStorage pode lançar em modo privado — segue para a detecção do navegador
  }

  const preferred = navigator.languages?.[0] ?? navigator.language ?? "";
  return preferred.toLowerCase().startsWith("pt") ? "pt" : "en";
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>(resolveInitialLanguage);

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // persistência é opcional
    }
    // O <title> e a meta description do index.html ficam em pt-BR de propósito:
    // este é um SPA client-rendered, então crawlers leem o HTML servido — trocar
    // por efeito não muda nada para eles. O caminho correto seria prerender/SSG.
    document.documentElement.lang = content[language].meta.htmlLang;
  }, [language]);

  const toggle = useCallback(() => {
    setLanguage((current) => (current === "pt" ? "en" : "pt"));
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, toggle }),
    [language, toggle],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};
