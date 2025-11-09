import { ExternalLink } from "lucide-react";
import { Icons } from "@/components/ui/icons";

interface ProjectCardProps {
  title: string;
  description: string;
  skills: string[];
  githubUrl?: string;
  liveUrl?: string;
  period?: string;
}

export const ProjectCard = ({
  title,
  description,
  skills,
  githubUrl,
  liveUrl,
  period,
}: ProjectCardProps) => {
  return (
    <div className="py-4">
      <h3 className="text-[19px] font-medium mb-2">{title}</h3>
      {period && (
        <p className="text-[13px] text-muted-foreground mb-2">{period}</p>
      )}
      <p className="text-[15px] mt-2 mb-3">{description}</p>
      <ul className="flex flex-wrap gap-2.5 mb-3">
        {skills.map((skill) => (
          <li
            key={skill}
            className="bg-secondary text-muted-foreground px-2 py-0.5 rounded-sm text-[14px]"
          >
            {skill}
          </li>
        ))}
      </ul>
      <div className="flex gap-2.5">
        {githubUrl && (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
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
            aria-label="Live Demo"
            className="text-muted-foreground hover:text-accent transition-colors"
          >
            <ExternalLink size={24} />
          </a>
        )}
      </div>
    </div>
  );
};
