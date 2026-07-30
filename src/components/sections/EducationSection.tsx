import { useRef } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { EducationItem } from "@/components/EducationItem";
import { useContent, useLanguage } from "@/hooks/use-language";
import { useSectionReveal } from "@/hooks/use-section-reveal";
import { useHeadingReveal } from "@/hooks/use-heading-reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { EducationEntry } from "@/content";

const ACCORDION_REFRESH_DELAY_MS = 250;

export const EducationSection = () => {
  const ref = useSectionReveal<HTMLElement>();
  const refreshTimeout = useRef<ReturnType<typeof setTimeout>>();
  const { language } = useLanguage();
  const { education } = useContent();

  useHeadingReveal(ref, "[data-edu='heading']", { deps: [language] });

  // Accordion muda a altura da página — reposiciona os triggers das seções seguintes
  const handleAccordionChange = () => {
    clearTimeout(refreshTimeout.current);
    refreshTimeout.current = setTimeout(() => ScrollTrigger.refresh(), ACCORDION_REFRESH_DELAY_MS);
  };

  const renderItems = (items: EducationEntry[]) => (
    <div className="space-y-2 pt-2">
      {items.map((item) => (
        <EducationItem
          key={item.id}
          degree={item.degree}
          institution={item.institution}
          period={item.period}
          completed={item.completed}
          details={item.details}
        />
      ))}
    </div>
  );

  return (
    <section ref={ref} id="formacao" className="mt-16 scroll-mt-8" aria-label={education.ariaLabel}>
      <h2 className="text-[21px] font-medium mb-4 overflow-hidden">
        <span data-edu="heading" className="inline-block">
          {education.heading}
        </span>
      </h2>

      <Accordion
        type="multiple"
        defaultValue={["em-andamento"]}
        className="w-full"
        onValueChange={handleAccordionChange}
      >
        <AccordionItem value="em-andamento">
          <AccordionTrigger className="text-[17px] font-semibold text-muted-foreground hover:no-underline">
            {education.inProgress}
          </AccordionTrigger>
          <AccordionContent>{renderItems(education.items.inProgress)}</AccordionContent>
        </AccordionItem>

        <AccordionItem value="concluido">
          <AccordionTrigger className="text-[17px] font-semibold text-muted-foreground hover:no-underline">
            {education.completed}
          </AccordionTrigger>
          <AccordionContent>{renderItems(education.items.completed)}</AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
};
