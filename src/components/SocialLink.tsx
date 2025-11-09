import { LucideIcon } from "lucide-react";

interface SocialLinkProps {
  icon: LucideIcon;
  href: string;
  label: string;
}

export const SocialLink = ({ icon: Icon, href, label }: SocialLinkProps) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="text-muted-foreground hover:text-accent transition-colors"
    >
      <Icon size={24} />
    </a>
  );
};
