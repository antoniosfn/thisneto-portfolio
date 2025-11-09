interface LanguageBadgeProps {
  language: string;
  level: string;
}

export const LanguageBadge = ({ language, level }: LanguageBadgeProps) => {
  return (
    <span className="inline-block bg-green-500/10 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-sm text-[14px] font-medium">
      {language} • {level}
    </span>
  );
};
