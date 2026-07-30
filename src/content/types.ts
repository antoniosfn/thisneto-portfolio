export type Language = "pt" | "en";

export interface NavItem {
  label: string;
  /**
   * Âncora da seção. Os targets são propositalmente independentes de idioma
   * (`#sobre`, `#experiencia`, ...) para que deep links e o menu continuem
   * funcionando ao trocar PT/EN. Não traduzir.
   */
  target: string;
  highlight?: boolean;
}

export interface ExperienceEntry {
  id: string;
  title: string;
  company: string;
  period: string;
  description: string;
}

export interface EducationEntry {
  id: string;
  degree: string;
  institution: string;
  period: string;
  completed?: boolean;
  details?: string;
}

export interface TechEntry {
  name: string;
  /** Chave mapeada para um componente de ícone dentro da seção — ícones ficam fora do conteúdo. */
  iconKey: string;
}

export interface ProjectEntry {
  id: string;
  title: string;
  description: string;
  skills: string[];
  period: string;
  githubUrl?: string;
  liveUrl?: string;
  isPrivateCode?: boolean;
  /** Reservado para screenshots / diagramas de arquitetura (ainda não renderizado). */
  image?: { src: string; alt: string };
}

export interface SiteContent {
  meta: {
    htmlLang: string;
  };
  nav: {
    items: NavItem[];
    open: string;
    close: string;
    label: string;
  };
  hero: {
    sectionAriaLabel: string;
    nameLines: [string, string];
    nameAriaLabel: string;
    tagline: string;
    photoAlt: string;
    scrollToContent: string;
  };
  intro: {
    ariaLabel: string;
    paragraph: string;
    languages: { language: string; level: string }[];
    softSkillsAriaLabel: string;
    softSkills: { icon: string; skill: string }[];
    socialLinksLabel: string;
  };
  experience: {
    heading: string;
    ariaLabel: string;
    items: ExperienceEntry[];
  };
  education: {
    heading: string;
    ariaLabel: string;
    inProgress: string;
    completed: string;
    items: { inProgress: EducationEntry[]; completed: EducationEntry[] };
  };
  tech: {
    heading: string;
    ariaLabel: string;
    items: TechEntry[];
  };
  projects: {
    heading: string;
    ariaLabel: string;
    featuredHeading: string;
    academicHeading: string;
    labels: { privateCode: string; github: string; liveDemo: string };
    featured: ProjectEntry[];
    academic: ProjectEntry[];
  };
  contact: {
    heading: string;
    ariaLabel: string;
    lead: string;
    ctaLabel: string;
    mailtoSubject: string;
    copyLabel: string;
    copiedLabel: string;
    copyToast: string;
    copyFailedToast: string;
    linkedinLabel: string;
    githubLabel: string;
  };
  footer: {
    text: string;
  };
  ui: {
    scrollToTop: string;
    languageToggle: string;
  };
}
