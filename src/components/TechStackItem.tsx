import { LucideIcon } from "lucide-react";

interface TechStackItemProps {
  name: string;
  icon: LucideIcon | React.ComponentType<React.HTMLAttributes<SVGElement>>;
}

export const TechStackItem = ({ name, icon: Icon }: TechStackItemProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 p-3 bg-card border border-border rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-md">
      <Icon size={24} className="text-accent" aria-hidden="true" />
      <span className="text-[12px] font-medium text-center">{name}</span>
    </div>
  );
};
