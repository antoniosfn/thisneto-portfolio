import { useEffect } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { useLanguage } from "@/hooks/use-language";
import { Hero } from "@/components/sections/Hero";
import { IntroSection } from "@/components/sections/IntroSection";
import { ExperienceSection } from "@/components/sections/ExperienceSection";
import { EducationSection } from "@/components/sections/EducationSection";
import { TechStackSection } from "@/components/sections/TechStackSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { SiteFooter } from "@/components/sections/SiteFooter";
import { ScrollToTop } from "@/components/ScrollToTop";

const Index = () => {
  const { language } = useLanguage();

  // Reposiciona os triggers depois que fontes e imagens definem o layout final.
  // Roda também ao trocar de idioma: PT e EN têm alturas de documento diferentes.
  useEffect(() => {
    let isMounted = true;
    document.fonts.ready.then(() => {
      if (isMounted) ScrollTrigger.refresh();
    });
    return () => {
      isMounted = false;
    };
  }, [language]);

  return (
    <div className="min-h-screen bg-background">
      {/*
        `key={language}` é o que garante a integridade das animações na troca de idioma:
        o SplitText envolve os caracteres em spans criados dentro de um `.then()` assíncrono,
        então só a remontagem completa elimina splits órfãos com texto obsoleto.
      */}
      <Hero key={`hero-${language}`} />

      <main
        key={`main-${language}`}
        id="conteudo"
        className="max-w-4xl mx-auto px-6 md:px-12 lg:px-16 pb-24"
      >
        <IntroSection />
        <ExperienceSection />
        <EducationSection />
        <TechStackSection />
        <ProjectsSection />
        <ContactSection />
        <SiteFooter />
      </main>

      <ScrollToTop />
    </div>
  );
};

export default Index;
