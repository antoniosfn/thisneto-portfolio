import {
  Brain,
  Cloud,
  CloudCog,
  Code,
  Container,
  Cpu,
  Database,
  Eye,
  FileCode,
  Layers,
  LineChart,
  Server,
  Sparkles,
  Table,
  Terminal,
  Workflow,
} from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { Icons } from "@/components/ui/icons";
import { TechStackItem } from "@/components/TechStackItem";
import { useContent, useLanguage } from "@/hooks/use-language";
import { useSectionReveal } from "@/hooks/use-section-reveal";
import { useHeadingReveal } from "@/hooks/use-heading-reveal";

/** Ícones ficam fora dos módulos de conteúdo — o conteúdo referencia só a chave. */
const TECH_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  brain: Brain,
  cloud: Cloud,
  cloudCog: CloudCog,
  code: Code,
  container: Container,
  cpu: Cpu,
  database: Database,
  eye: Eye,
  fileCode: FileCode,
  github: Icons.github,
  layers: Layers,
  lineChart: LineChart,
  react: Icons.react,
  server: Server,
  sparkles: Sparkles,
  table: Table,
  terminal: Terminal,
  workflow: Workflow,
};

export const TechStackSection = () => {
  const ref = useSectionReveal<HTMLElement>();
  const { language } = useLanguage();
  const { tech } = useContent();

  useHeadingReveal(ref, "[data-tech='heading']", { deps: [language] });

  useGSAP(
    () => {
      if (!ref.current) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Tweens individuais por item (com `delay` escalonado) em vez de um único
        // `gsap.from()` com `stagger` — combinar `stagger` num tween/timeline com
        // muitos alvos e um ScrollTrigger compartilhado deixa os itens presos em
        // opacity 0 mesmo após a animação reportar progress 1 (bug observado nesta
        // versão do GSAP). Tweens separados por item, como já feito para os cards
        // de projeto em ProjectsSection, não têm esse problema.
        gsap.utils.toArray<HTMLElement>("[data-tech='grid'] > *").forEach((item, i) => {
          gsap.from(item, {
            scale: 0.8,
            opacity: 0,
            y: 12,
            duration: 0.5,
            delay: i * 0.04,
            ease: "back.out(1.4)",
            scrollTrigger: { trigger: ref.current, start: "top 75%" },
          });
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-tech='grid'] > *", {
          opacity: 1,
          scale: 1,
          y: 0,
          clearProps: "all",
        });
      });
    },
    { scope: ref, dependencies: [language], revertOnUpdate: true },
  );

  return (
    <section ref={ref} id="tecnologias" className="mt-16 scroll-mt-8" aria-label={tech.ariaLabel}>
      <h2 className="text-[21px] font-medium mb-4 overflow-hidden">
        <span data-tech="heading" className="inline-block">
          {tech.heading}
        </span>
      </h2>
      <div data-tech="grid" className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {tech.items.map((item) => {
          const Icon = TECH_ICONS[item.iconKey];
          if (!Icon) return null;
          return <TechStackItem key={item.name} name={item.name} icon={Icon} />;
        })}
      </div>
    </section>
  );
};
