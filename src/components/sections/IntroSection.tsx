import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { Icons } from "@/components/ui/icons";
import { LanguageBadge } from "@/components/LanguageBadge";
import { SoftSkillBadge } from "@/components/SoftSkillBadge";
import { LINKS } from "@/content";
import { useContent, useLanguage } from "@/hooks/use-language";
import { useSectionReveal } from "@/hooks/use-section-reveal";
import { useHeadingReveal } from "@/hooks/use-heading-reveal";

export const IntroSection = () => {
  const ref = useSectionReveal<HTMLElement>();
  const { language } = useLanguage();
  const { intro } = useContent();

  useHeadingReveal(ref, "[data-intro='heading']", { type: "words", deps: [language] });

  useGSAP(
    () => {
      if (!ref.current) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-intro='item']", {
          y: 16,
          opacity: 0,
          scale: 0.9,
          duration: 0.5,
          stagger: 0.06,
          ease: "power2.out",
          scrollTrigger: { trigger: ref.current, start: "top 80%" },
        });
      });
    },
    { scope: ref, dependencies: [language], revertOnUpdate: true },
  );

  return (
    <section ref={ref} id="sobre" className="pt-20" aria-label={intro.ariaLabel}>
      <p data-intro="heading" className="text-[17px] mt-0 mb-0 leading-relaxed">
        {intro.paragraph}
      </p>

      <ul className="flex gap-2.5 mt-6 mb-0 p-0" aria-label={intro.socialLinksLabel}>
        <li className="list-none" data-intro="item">
          <a
            href={LINKS.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="text-muted-foreground hover:text-accent transition-colors"
          >
            <Icons.github className="w-6 h-6" />
          </a>
        </li>
        <li className="list-none" data-intro="item">
          <a
            href={LINKS.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="text-muted-foreground hover:text-accent transition-colors"
          >
            <Icons.linkedin className="w-6 h-6" />
          </a>
        </li>
      </ul>

      <div className="flex flex-wrap gap-2.5 mt-8">
        {intro.languages.map((item) => (
          <span key={item.language} data-intro="item">
            <LanguageBadge language={item.language} level={item.level} />
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2.5 mt-8" aria-label={intro.softSkillsAriaLabel}>
        {intro.softSkills.map((item) => (
          <span key={item.skill} data-intro="item">
            <SoftSkillBadge skill={item.skill} icon={item.icon} />
          </span>
        ))}
      </div>
    </section>
  );
};
