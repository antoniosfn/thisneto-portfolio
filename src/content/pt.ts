import { LINKS } from "./links";
import type { SiteContent } from "./types";

export const pt: SiteContent = {
  meta: {
    htmlLang: "pt-BR",
  },

  nav: {
    label: "Navegação principal",
    open: "Abrir menu",
    close: "Fechar menu",
    items: [
      { label: "HOME", target: "#home", highlight: true },
      { label: "SOBRE", target: "#sobre" },
      { label: "EXPERIÊNCIA", target: "#experiencia" },
      { label: "FORMAÇÃO", target: "#formacao" },
      { label: "TECNOLOGIAS", target: "#tecnologias" },
      { label: "PROJETOS", target: "#projetos" },
      { label: "CONTATO", target: "#contato" },
    ],
  },

  hero: {
    sectionAriaLabel: "Apresentação",
    nameLines: ["ANTONIO", "NETO"],
    nameAriaLabel: "Antonio Neto",
    tagline: "Engenheiro de Soluções | IA Aplicada & Desenvolvedor Full-Stack",
    photoAlt: "Foto de Antonio Neto",
    scrollToContent: "Rolar para o conteúdo",
  },

  intro: {
    ariaLabel: "Apresentação e Habilidades",
    paragraph:
      "Sou estudante de Engenharia de Computação na PUCPR, Licenciado em Matemática pela UEPA e Pesquisador em Transformação Digital na HOTMILK. Desenvolvo soluções que unem Inteligência Artificial, engenharia de software e ciência de dados para transformar conhecimento em inovação. Minha atuação envolve agentes de IA, Web Semântica, automação e desenvolvimento full-stack, sempre com foco em criar tecnologias que gerem impacto real.",
    socialLinksLabel: "Links Sociais",
    languages: [
      { language: "Português BR", level: "Nativo" },
      { language: "Inglês", level: "Profissional" },
    ],
    softSkillsAriaLabel: "Soft Skills",
    softSkills: [
      { icon: "🎓", skill: "Autodidata" },
      { icon: "💬", skill: "Comunicativo" },
      { icon: "🤝", skill: "Trabalho em Equipe" },
      { icon: "⚡", skill: "Proatividade" },
    ],
  },

  experience: {
    heading: "EXPERIÊNCIA",
    ariaLabel: "Experiência",
    items: [
      {
        id: "hotmilk",
        title: "Pesquisador Técnico em Transformação Digital",
        company: "HOTMILK | Ecossistema de Inovação PUCPR",
        period: "ago 2025 - Presente · Curitiba, PR",
        description:
          "Desenvolvimento de agentes de IA com RAG, LangChain, embeddings e pgvector para busca semântica sobre a base de pesquisa da universidade. Construção de aplicações web full-stack (TypeScript, React.js, PostgreSQL) em colaboração com times multidisciplinares. Projeto de destaque: Innovation Skills Management — portal de busca semântica para competências, projetos, patentes e publicações científicas da PUCPR. PD&I em soluções de transformação digital e otimização de processos operacionais.",
      },
      {
        id: "robotica",
        title: "Membro da Equipe de Robótica Móvel (voluntário)",
        company: "Pontifícia Universidade Católica do Paraná (PUCPR)",
        period: "mai 2023 - mai 2026 · Curitiba, PR",
        description:
          "Liderança no desenvolvimento do robô autônomo 'Relâmpago Marquinhos' (LEGO Sumo) — 3º lugar no Salão de Robótica 2023. Liderança no desenvolvimento do robô de combate categoria Fairyweight (150g) — 2º lugar na Copa Pinhão 2025. Aplicação de modelagem CAD e impressão 3D FDM (TPU/PLA) no desenvolvimento e manutenção dos robôs.",
      },
      {
        id: "ideplan",
        title: "Técnico em Manutenção e Suporte em Informática",
        company:
          "Instituto de Defesa do Planejamento e Desenvolvimento Urbano Sustentável (IDEPLAN)",
        period: "jan 2020 - dez 2020 · Conceição do Araguaia, PA",
        description:
          "Suporte técnico a colaboradores: manutenção de computadores, instalação de sistemas operacionais e configuração de redes. Apoio ao Analista de TI na implementação de projetos e resolução de incidentes.",
      },
    ],
  },

  education: {
    heading: "FORMAÇÃO ACADÊMICA",
    ariaLabel: "Formação Acadêmica",
    inProgress: "Em Andamento",
    completed: "Concluído",
    items: {
      inProgress: [
        {
          id: "eng-computacao",
          degree: "Bacharel em Engenharia de Computação",
          institution: "Pontifícia Universidade Católica do Paraná",
          period: "2023 - Presente",
        },
      ],
      completed: [
        {
          id: "matematica",
          degree: "Licenciatura Plena Matemática",
          institution: "Universidade do Estado do Pará",
          period: "2018 - 2021",
          completed: true,
          details:
            "TCC: 'A importância dos números primos na proteção de dados virtuais: Criptografia RSA e suas aplicações na Internet' — fundamentação matemática em teoria dos números aplicada à segurança de dados. Membro da coordenação do Diretório Acadêmico dos Estudantes (2019-2020).",
        },
        {
          id: "tecnico-ifpa",
          degree: "Técnico em Manutenção e Suporte em Informática",
          institution: "Instituto Federal de Educação, Ciência e Tecnologia do Pará",
          period: "2020 - 2021",
          completed: true,
          details:
            "Projeto final: 'Descubra seu PC', sistema web de recomendação de hardware com base no perfil de uso do usuário.",
        },
        {
          id: "medio-edificacoes",
          degree: "Ensino Médio Integrado em Edificações",
          institution: "Instituto Federal de Educação, Ciência e Tecnologia do Pará",
          period: "2015 - 2017",
          completed: true,
        },
      ],
    },
  },

  tech: {
    heading: "TECNOLOGIAS E FERRAMENTAS",
    ariaLabel: "Tecnologias e Ferramentas",
    items: [
      { name: "RAG / LangChain", iconKey: "sparkles" },
      { name: "Embeddings / pgvector", iconKey: "layers" },
      { name: "Machine Learning", iconKey: "lineChart" },
      { name: "Python", iconKey: "fileCode" },
      { name: "TypeScript", iconKey: "fileCode" },
      { name: "JavaScript", iconKey: "code" },
      { name: "React", iconKey: "react" },
      { name: "Next.js", iconKey: "code" },
      { name: "Node.js", iconKey: "server" },
      { name: "C", iconKey: "terminal" },
      { name: "PostgreSQL", iconKey: "database" },
      { name: "MySQL", iconKey: "database" },
      { name: "Docker", iconKey: "container" },
      { name: "AWS", iconKey: "cloud" },
      { name: "GCP", iconKey: "cloudCog" },
      { name: "N8N / RPA", iconKey: "workflow" },
      { name: "Git / GitHub", iconKey: "github" },
      { name: "Pandas", iconKey: "table" },
      { name: "Scikit-learn", iconKey: "lineChart" },
      { name: "TensorFlow", iconKey: "brain" },
      { name: "OpenCV", iconKey: "eye" },
      { name: "Arduino", iconKey: "cpu" },
    ],
  },

  projects: {
    heading: "PROJETOS",
    ariaLabel: "Projetos",
    featuredHeading: "Projetos em destaque",
    academicHeading: "Projetos acadêmicos e de estudo",
    labels: {
      privateCode: "Código privado",
      github: "Ver no GitHub",
      liveDemo: "Ver demonstração",
    },
    featured: [
      {
        id: "ism",
        title: "Innovation Skills Management",
        period: "2025 - Presente",
        isPrivateCode: true,
        description:
          "Portal de busca semântica que unificou ~90,4 mil registros dispersos entre produções Lattes/CNPq, publicações OpenAlex, registros Scopus, patentes e projetos, com 1.485 competências catalogadas em 42 áreas estratégicas e 3.617 vínculos pesquisador-competência, atendendo 6 escolas e 36 programas de pós-graduação da PUCPR. Pipeline de desambiguação publicação-professor (9.949 vínculos validados em 5 níveis de confiança) e otimização de leitura via réplica local, ~18x mais rápida que o acesso direto ao banco na nuvem.",
        skills: [
          "RAG",
          "LangChain",
          "pgvector",
          "Python",
          "React",
          "Node.js",
          "Next.js",
          "TypeScript",
          "PostgreSQL",
          "AWS (ECS, RDS, S3, Lambda)",
          "Docker / Docker Compose",
        ],
      },
      {
        id: "vibecrawl",
        title: "Vibecrawl - Crawler & Scraper Agents",
        period: "2025 - Presente",
        isPrivateCode: true,
        description:
          "Motor de web scraping assistido por LLM: o modelo é chamado uma única vez por fonte para construir uma recipe de extração; execuções seguintes são replay determinístico, sem custo de LLM, com auto-recuperação quando o layout do site muda. Pipeline em produção alimentando um observatório de editais de fomento (CNPq, CAPES, FINEP, FAPESP, FAPERJ, BNDES), com anti-bot em camadas, retry com backoff e telemetria; API pública com autenticação por chave e rate limiting.",
        skills: [
          "LLM",
          "Web Scraping",
          "Python",
          "APIs REST",
          "Node.js",
          "Next.js",
          "TypeScript",
          "PostgreSQL",
          "AWS (ECS, RDS, S3, Lambda)",
          "Docker / Docker Compose",
        ],
      },
    ],
    academic: [
      {
        id: "no2",
        title: "Previsão da Qualidade do Ar (NO₂)",
        period: "2024",
        githubUrl: LINKS.repos.airQuality,
        description:
          "Previsão de concentração de NO₂ a partir de séries temporais, comparando Regressão Linear, Random Forest e modelo de Persistência (baseline); engenharia de features temporais e validação cruzada Time Series, avaliada por MSE e MAE.",
        skills: ["Python", "Machine Learning", "Pandas", "Scikit-learn", "Time Series"],
      },
      {
        id: "dijkstra",
        title: "City Map Shortest Path Dijkstra in C",
        period: "ago - dez 2024",
        githubUrl: LINKS.repos.dijkstra,
        description:
          "Modelagem de mapa urbano como grafo e cálculo do menor caminho entre origem e destino com o algoritmo de Dijkstra, usando listas de adjacência e fila de prioridade (min-heap).",
        skills: ["C", "Algoritmos", "Estruturas de Dados", "Grafos", "Dijkstra"],
      },
      {
        id: "kmeans",
        title: "Detecção de Anomalias com K-Means e PCA",
        period: "2024",
        githubUrl: LINKS.repos.anomalies,
        description:
          "Aplicação de clustering K-Means e PCA no dataset California Housing para identificar agrupamentos naturais e detectar anomalias através do erro de reconstrução e redução dimensional.",
        skills: ["Python", "Machine Learning", "K-Means", "PCA", "Clustering"],
      },
      {
        id: "currency",
        title: "Currency Quotation",
        period: "2023",
        githubUrl: LINKS.repos.currency,
        description:
          "Script que consome uma API pública para obter cotações de moedas em tempo real.",
        skills: ["Python", "API REST", "JSON"],
      },
      {
        id: "weather",
        title: "Weather with API REST",
        period: "2023",
        githubUrl: LINKS.repos.weather,
        description:
          "Consulta de dados meteorológicos por localização, consumindo a API REST gratuita do OpenWeatherMap.",
        skills: ["Python", "API REST", "OpenWeatherMap"],
      },
      {
        id: "descubra-seu-pc",
        title: "Descubra seu PC",
        period: "2020",
        githubUrl: LINKS.repos.descubraSeuPc,
        description:
          "Sistema web de recomendação de hardware, otimizando a seleção de componentes e notebooks com base no perfil de uso do usuário.",
        skills: ["HTML", "CSS", "PHP", "Sistemas de Recomendação"],
      },
      {
        id: "consultoria",
        title: "Consultoria Jurídica",
        period: "2020",
        githubUrl: LINKS.repos.consultoria,
        description:
          "Site institucional para escritório de advocacia, desenvolvido durante meus estudos de desenvolvimento web.",
        skills: ["HTML", "CSS", "PHP", "JavaScript"],
      },
      {
        id: "calculadora",
        title: "Calculadora (NetBeans)",
        period: "2019",
        githubUrl: LINKS.repos.calculadora,
        description:
          "Calculadora desktop em Java com as quatro operações básicas. Requisito parcial da disciplina de Linguagem de Programação no Curso Técnico em Manutenção e Suporte em Informática do IFPA.",
        skills: ["Java", "NetBeans", "POO"],
      },
    ],
  },

  contact: {
    heading: "CONTATO",
    ariaLabel: "Contato",
    lead: "Aberto a oportunidades, colaborações e conversas sobre IA aplicada, engenharia de software e inovação. A melhor forma de me alcançar é por e-mail.",
    ctaLabel: "Vamos conversar",
    mailtoSubject: "Contato via portfólio",
    copyLabel: "Copiar e-mail",
    copiedLabel: "Copiado!",
    copyToast: "E-mail copiado para a área de transferência.",
    copyFailedToast: "Não foi possível copiar. Use o botão de e-mail.",
    linkedinLabel: "LinkedIn",
    githubLabel: "GitHub",
  },

  footer: {
    text: "Antonio Neto. Copyright © 2025-2026. Todos os direitos reservados.",
  },

  ui: {
    scrollToTop: "Voltar ao Topo",
    languageToggle: "Selecionar idioma",
  },
};
