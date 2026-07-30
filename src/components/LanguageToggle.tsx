import { useContent, useLanguage } from "@/hooks/use-language";
import type { Language } from "@/content";

const OPTIONS: { value: Language; label: string }[] = [
  { value: "pt", label: "PT" },
  { value: "en", label: "EN" },
];

export const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();
  const { ui } = useContent();

  return (
    <div
      role="group"
      aria-label={ui.languageToggle}
      className="flex items-center gap-0.5 rounded-full border border-white/15 px-1 py-0.5 font-mono text-[13px] tracking-wide"
    >
      {OPTIONS.map((option) => {
        const isActive = language === option.value;
        return (
          <button
            key={option.value}
            type="button"
            lang={option.value}
            aria-pressed={isActive}
            onClick={() => setLanguage(option.value)}
            className={`rounded-full px-2 py-0.5 transition-colors duration-300 ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-neutral-500 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
