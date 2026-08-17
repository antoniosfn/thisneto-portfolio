interface TechStackItemProps {
  name: string;
  /** Aceita ícones lucide e os SVGs custom de @/components/ui/icons — ambos repassam className. */
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export const TechStackItem = ({ name, icon: Icon }: TechStackItemProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 p-3 bg-card border border-border rounded-lg transition-[box-shadow,transform] duration-300 hover:scale-105 hover:shadow-md">
      <Icon className="w-6 h-6 shrink-0 text-accent" aria-hidden="true" />
      <span className="text-[12px] font-medium text-center">{name}</span>
    </div>
  );
};
