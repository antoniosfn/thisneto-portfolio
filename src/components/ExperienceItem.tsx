interface ExperienceItemProps {
  title: string;
  company: string;
  period: string;
  description?: string;
}

export const ExperienceItem = ({
  title,
  company,
  period,
  description,
}: ExperienceItemProps) => {
  return (
    <div className="py-2">
      <h3 className="text-[19px] font-medium mb-0.5">{title}</h3>
      <p className="text-[15px] text-muted-foreground mt-3">
        {company} • {period}
      </p>
      {description && (
        <p className="text-[14px] text-muted-foreground mt-2">{description}</p>
      )}
    </div>
  );
};
