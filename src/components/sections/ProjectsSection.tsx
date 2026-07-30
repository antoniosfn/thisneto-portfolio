import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { ProjectCard } from "@/components/ProjectCard";
import { useContent, useLanguage } from "@/hooks/use-language";
import { useSectionReveal } from "@/hooks/use-section-reveal";
import { useHeadingReveal } from "@/hooks/use-heading-reveal";
import type { ProjectEntry } from "@/content";

export const ProjectsSection = () => {
  const ref = useSectionReveal<HTMLElement>();
  const { language } = useLanguage();
  const { projects } = useContent();

  useHeadingReveal(ref, "[data-proj='heading']", { deps: [language] });

  useGSAP(
    () => {
      if (!ref.current) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-proj='group-heading']", {
          opacity: 0,
          y: 12,
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: { trigger: ref.current, start: "top 80%" },
        });

        gsap.utils.toArray<HTMLElement>("[data-proj='card']").forEach((card) => {
          gsap.from(card, {
            y: 48,
            opacity: 0,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: { trigger: card, start: "top 85%" },
          });
        });
      });
    },
    { scope: ref, dependencies: [language], revertOnUpdate: true },
  );

  const renderCard = (project: ProjectEntry, variant: "default" | "compact") => (
    <div
      key={project.id}
      data-proj="card"
      className="transition-transform duration-300 hover:-translate-y-1"
    >
      <ProjectCard
        title={project.title}
        description={project.description}
        skills={project.skills}
        period={project.period}
        githubUrl={project.githubUrl}
        liveUrl={project.liveUrl}
        isPrivateCode={project.isPrivateCode}
        variant={variant}
        labels={projects.labels}
      />
    </div>
  );

  return (
    <section ref={ref} id="projetos" className="mt-16 scroll-mt-8" aria-label={projects.ariaLabel}>
      <h2 className="text-[21px] font-medium mb-4 overflow-hidden">
        <span data-proj="heading" className="inline-block">
          {projects.heading}
        </span>
      </h2>

      <h3
        data-proj="group-heading"
        className="text-[17px] font-semibold text-accent mt-2 mb-1 uppercase tracking-wide"
      >
        {projects.featuredHeading}
      </h3>
      {projects.featured.map((project) => renderCard(project, "default"))}

      <h3
        data-proj="group-heading"
        className="text-[17px] font-semibold text-muted-foreground mt-10 mb-1 uppercase tracking-wide"
      >
        {projects.academicHeading}
      </h3>
      {projects.academic.map((project) => renderCard(project, "compact"))}
    </section>
  );
};
