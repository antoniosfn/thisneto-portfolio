import { createContext } from "react";
import type { Language } from "@/content";

export const LANGUAGE_STORAGE_KEY = "thisneto:lang";

export interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggle: () => void;
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
