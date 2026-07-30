interface EducationItemProps {
  degree: string;
  institution: string;
  period: string;
  completed?: boolean;
  details?: string;
}

export const EducationItem = ({
  degree,
  institution,
  period,
  completed,
  details,
}: EducationItemProps) => {
  return (
    <div className="py-2">
      <h3 className="text-[19px] font-medium mb-0.5">{degree}</h3>
      <p className="text-[15px] text-muted-foreground mt-3">
        {institution} • {period}
      </p>
      {details && (
        <p className="text-[14px] text-muted-foreground italic mt-2">
          {details}
        </p>
      )}
      {completed && (
        <span className="inline-block mt-2 bg-accent/10 text-accent px-2 py-0.5 rounded-sm text-[13px]">
          ✓ Concluído
        </span>
      )}
    </div>
  );
};
