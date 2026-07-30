interface LanguageBadgeProps {
  language: string;
  level: string;
}

export const LanguageBadge = ({ language, level }: LanguageBadgeProps) => {
  return (
    <span className="inline-block bg-accent/10 text-accent px-3 py-1.5 rounded-sm text-[14px] font-medium">
      {language} • {level}
    </span>
  );
};
