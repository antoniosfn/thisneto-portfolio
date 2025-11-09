interface SkillBadgeProps {
  skill: string;
}

export const SkillBadge = ({ skill }: SkillBadgeProps) => {
  return (
    <span className="inline-block bg-primary/10 text-primary px-3 py-1.5 rounded-sm text-[14px] font-medium">
      {skill}
    </span>
  );
};
