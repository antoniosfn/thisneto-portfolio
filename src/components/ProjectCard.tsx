import { ExternalLink, Lock } from "lucide-react";
import { Icons } from "@/components/ui/icons";

interface ProjectCardProps {
  title: string;
  description: string;
  skills: string[];
  period: string;
  variant?: "default" | "compact";
  githubUrl?: string;
  liveUrl?: string;
  /** Código fechado (propriedade da universidade): exibe um selo no lugar do link. */
  isPrivateCode?: boolean;
  /** Reservado para screenshots / diagramas de arquitetura — ainda não renderizado. */
  image?: { src: string; alt: string };
  labels: { privateCode: string; github: string; liveDemo: string };
}

export const ProjectCard = ({
  title,
  description,
  skills,
  period,
  variant = "default",
  githubUrl,
  liveUrl,
  isPrivateCode,
  labels,
}: ProjectCardProps) => {
  const isCompact = variant === "compact";

  return (
    <div className={isCompact ? "py-3" : "py-4"}>
      <h4 className={`font-medium mb-1 ${isCompact ? "text-[17px]" : "text-[19px]"}`}>{title}</h4>
      <p className="text-[13px] text-muted-foreground mb-2">{period}</p>
      <p className={`mb-3 ${isCompact ? "text-[14px]" : "text-[15px]"}`}>{description}</p>
      <ul className={`flex flex-wrap mb-3 ${isCompact ? "gap-2" : "gap-2.5"}`}>
        {skills.map((skill) => (
          <li
            key={skill}
            className={`bg-secondary text-muted-foreground rounded-sm ${
              isCompact ? "text-[13px] px-1.5 py-0.5" : "text-[14px] px-2 py-0.5"
            }`}
          >
            {skill}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2.5">
        {isPrivateCode && !githubUrl && (
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Lock className="w-4 h-4" aria-hidden="true" />
            {labels.privateCode}
          </span>
        )}
        {githubUrl && (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={labels.github}
            className="text-muted-foreground hover:text-accent transition-colors"
          >
            <Icons.github className="w-6 h-6" />
          </a>
        )}
        {liveUrl && (
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={labels.liveDemo}
            className="text-muted-foreground hover:text-accent transition-colors"
          >
            <ExternalLink className="w-6 h-6" />
          </a>
        )}
      </div>
    </div>
  );
};
