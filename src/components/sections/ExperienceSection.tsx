import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { ExperienceItem } from "@/components/ExperienceItem";
import { useContent, useLanguage } from "@/hooks/use-language";
import { useSectionReveal } from "@/hooks/use-section-reveal";
import { useHeadingReveal } from "@/hooks/use-heading-reveal";

export const ExperienceSection = () => {
  const ref = useSectionReveal<HTMLElement>();
  const { language } = useLanguage();
  const { experience } = useContent();

  useHeadingReveal(ref, "[data-exp='heading']", { deps: [language] });

  useGSAP(
    () => {
      if (!ref.current) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-exp='item']", {
          x: -24,
          opacity: 0,
          duration: 0.7,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 75%" },
        });

        gsap.fromTo(
          "[data-exp='timeline']",
          { scaleY: 0 },
          {
            scaleY: 1,
            transformOrigin: "top",
            ease: "none",
            scrollTrigger: {
              trigger: ref.current,
              start: "top 70%",
              end: "bottom 60%",
              scrub: 0.5,
            },
          },
        );
      });
    },
    { scope: ref, dependencies: [language], revertOnUpdate: true },
  );

  return (
    <section
      ref={ref}
      id="experiencia"
      className="mt-16 scroll-mt-8"
      aria-label={experience.ariaLabel}
    >
      <h2 className="text-[21px] font-medium mb-4 overflow-hidden">
        <span data-exp="heading" className="inline-block">
          {experience.heading}
        </span>
      </h2>
      <div className="relative pl-5">
        <span
          data-exp="timeline"
          aria-hidden="true"
          className="absolute left-0 top-1 bottom-1 w-0.5 bg-accent"
        />
        {experience.items.map((item) => (
          <div key={item.id} data-exp="item">
            <ExperienceItem
              title={item.title}
              company={item.company}
              period={item.period}
              description={item.description}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
