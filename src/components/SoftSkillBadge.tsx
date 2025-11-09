interface SoftSkillBadgeProps {
  skill: string;
  icon?: string;
}

export const SoftSkillBadge = ({ skill, icon }: SoftSkillBadgeProps) => {
  return (
    <span className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-700 dark:text-purple-400 px-3 py-1.5 rounded-sm text-[14px] font-medium">
      {icon && <span className="text-base">{icon}</span>}
      {skill}
    </span>
  );
};
