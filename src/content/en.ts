import { LINKS } from "./links";
import type { SiteContent } from "./types";

export const en: SiteContent = {
  meta: {
    htmlLang: "en",
  },

  nav: {
    label: "Main navigation",
    open: "Open menu",
    close: "Close menu",
    items: [
      { label: "HOME", target: "#home", highlight: true },
      { label: "ABOUT", target: "#sobre" },
      { label: "EXPERIENCE", target: "#experiencia" },
      { label: "EDUCATION", target: "#formacao" },
      { label: "TECH STACK", target: "#tecnologias" },
      { label: "PROJECTS", target: "#projetos" },
      { label: "CONTACT", target: "#contato" },
    ],
  },

  hero: {
    sectionAriaLabel: "Introduction",
    nameLines: ["ANTONIO", "NETO"],
    nameAriaLabel: "Antonio Neto",
    tagline: "Solutions Engineer | Applied AI & Full-Stack Developer",
    photoAlt: "Photo of Antonio Neto",
    scrollToContent: "Scroll to content",
  },

  intro: {
    ariaLabel: "Introduction and Skills",
    paragraph:
      "I'm a Computer Engineering student at PUCPR, hold a degree in Mathematics from UEPA, and work as a Digital Transformation Researcher at HOTMILK. I build solutions that bring together Artificial Intelligence, software engineering and data science to turn knowledge into innovation. My work spans AI agents, Semantic Web, automation and full-stack development, always focused on creating technology with real-world impact.",
    socialLinksLabel: "Social links",
    languages: [
      { language: "Portuguese BR", level: "Native" },
      { language: "English", level: "Professional" },
    ],
    softSkillsAriaLabel: "Soft skills",
    softSkills: [
      { icon: "🎓", skill: "Self-taught" },
      { icon: "💬", skill: "Communicative" },
      { icon: "🤝", skill: "Teamwork" },
      { icon: "⚡", skill: "Proactive" },
    ],
  },

  experience: {
    heading: "EXPERIENCE",
    ariaLabel: "Experience",
    items: [
      {
        id: "hotmilk",
        title: "Technical Researcher in Digital Transformation",
        company: "HOTMILK | PUCPR Innovation Ecosystem",
        period: "Aug 2025 - Present · Curitiba, Brazil",
        description:
          "Building AI agents with RAG, LangChain, embeddings and pgvector for semantic search across the university's research base. Developing full-stack web applications (TypeScript, React.js, PostgreSQL) in collaboration with multidisciplinary teams. Flagship project: Innovation Skills Management — a semantic search portal for PUCPR's skills, projects, patents and scientific publications. R&D on digital transformation solutions and operational process optimization.",
      },
      {
        id: "robotica",
        title: "Mobile Robotics Team Member (volunteer)",
        company: "Pontifical Catholic University of Paraná (PUCPR)",
        period: "May 2023 - May 2026 · Curitiba, Brazil",
        description:
          "Led the development of the autonomous robot 'Relâmpago Marquinhos' (LEGO Sumo) — 3rd place at Salão de Robótica 2023. Led the development of a Fairyweight (150g) combat robot — 2nd place at Copa Pinhão 2025. Applied CAD modeling and FDM 3D printing (TPU/PLA) to build and maintain the robots.",
      },
      {
        id: "ideplan",
        title: "IT Maintenance and Support Technician",
        company: "Institute for Sustainable Urban Planning and Development Defense (IDEPLAN)",
        period: "Jan 2020 - Dec 2020 · Conceição do Araguaia, Brazil",
        description:
          "Technical support for staff: computer maintenance, operating system installation and network configuration. Supported the IT Analyst on project implementation and incident resolution.",
      },
    ],
  },

  education: {
    heading: "EDUCATION",
    ariaLabel: "Education",
    inProgress: "In progress",
    completed: "Completed",
    items: {
      inProgress: [
        {
          id: "eng-computacao",
          degree: "B.Sc. in Computer Engineering",
          institution: "Pontifical Catholic University of Paraná",
          period: "2023 - Present",
        },
      ],
      completed: [
        {
          id: "matematica",
          degree: "Licentiate Degree in Mathematics",
          institution: "State University of Pará",
          period: "2018 - 2021",
          completed: true,
          details:
            "Thesis: 'The role of prime numbers in protecting digital data: RSA cryptography and its applications on the Internet' — mathematical foundations of number theory applied to data security. Member of the Student Academic Council coordination (2019-2020).",
        },
        {
          id: "tecnico-ifpa",
          degree: "Technical Degree in IT Maintenance and Support",
          institution: "Federal Institute of Education, Science and Technology of Pará",
          period: "2020 - 2021",
          completed: true,
          details:
            "Final project: 'Descubra seu PC', a web system that recommends hardware based on the user's usage profile.",
        },
        {
          id: "medio-edificacoes",
          degree: "High School Diploma with Technical Degree in Building Construction",
          institution: "Federal Institute of Education, Science and Technology of Pará",
          period: "2015 - 2017",
          completed: true,
        },
      ],
    },
  },

  tech: {
    heading: "TECH STACK & TOOLS",
    ariaLabel: "Tech stack and tools",
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
    heading: "PROJECTS",
    ariaLabel: "Projects",
    featuredHeading: "Featured projects",
    academicHeading: "Academic & learning projects",
    labels: {
      privateCode: "Private codebase",
      github: "View on GitHub",
      liveDemo: "View live demo",
    },
    featured: [
      {
        id: "ism",
        title: "Innovation Skills Management",
        period: "2025 - Present",
        isPrivateCode: true,
        description:
          "Semantic search portal that unified ~90.4k records scattered across Lattes/CNPq production data, OpenAlex publications, Scopus records, patents and projects — cataloguing 1,485 skills across 42 strategic areas and 3,617 researcher-skill links, serving 6 schools and 36 graduate programs at PUCPR. Includes a publication-to-professor disambiguation pipeline (9,949 links validated across 5 confidence levels) and read-path optimization via a local replica, ~18x faster than querying the cloud database directly.",
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
        period: "2026 - Present",
        isPrivateCode: true,
        description:
          "LLM-assisted web scraping engine: the model is called once per source to build an extraction recipe; subsequent runs are deterministic replay with zero LLM cost, self-healing when a site's layout changes. Production pipeline feeding a research-funding call observatory (CNPq, CAPES, FINEP, FAPESP, FAPERJ, BNDES), with layered anti-bot handling, retry with backoff and telemetry; public API with key authentication and rate limiting.",
        skills: [
          "LLM",
          "Web Scraping",
          "Python",
          "REST APIs",
          "Node.js",
          "Next.js",
          "TypeScript",
          "PostgreSQL",
          "AWS (ECS, RDS, S3, Lambda)",
          "Docker / Docker Compose",
        ],
      },
    ],
    // Ordem cronológica crescente (mais antigo primeiro) — deve espelhar pt.ts.
    academic: [
      {
        id: "calculadora",
        title: "Calculator (NetBeans)",
        period: "2019",
        githubUrl: LINKS.repos.calculadora,
        description:
          "Java desktop calculator with the four basic operations. Partial requirement for the Programming Language course in the IT Maintenance and Support Technical Course at IFPA.",
        skills: ["Java", "NetBeans", "OOP"],
      },
      {
        id: "consultoria",
        title: "Legal Consultancy Website",
        period: "2020",
        githubUrl: LINKS.repos.consultoria,
        description:
          "Institutional website for a law firm, built while studying web development.",
        skills: ["HTML", "CSS", "PHP", "JavaScript"],
      },
      {
        id: "descubra-seu-pc",
        title: "Descubra seu PC",
        period: "2020",
        githubUrl: LINKS.repos.descubraSeuPc,
        description:
          "Web-based hardware recommendation system that optimizes the selection of components and laptops based on the user's usage profile.",
        skills: ["HTML", "CSS", "PHP", "Recommender Systems"],
      },
      {
        id: "weather",
        title: "Weather with API REST",
        period: "2023",
        githubUrl: LINKS.repos.weather,
        description:
          "Weather lookup by location, consuming OpenWeatherMap's free REST API.",
        skills: ["Python", "REST API", "OpenWeatherMap"],
      },
      {
        id: "currency",
        title: "Currency Quotation",
        period: "2023",
        githubUrl: LINKS.repos.currency,
        description:
          "Script that consumes a public API to fetch real-time currency exchange rates.",
        skills: ["Python", "REST API", "JSON"],
      },
      {
        id: "kmeans",
        title: "Anomaly Detection with K-Means and PCA",
        period: "2024",
        githubUrl: LINKS.repos.anomalies,
        description:
          "Applying K-Means clustering and PCA to the California Housing dataset to identify natural groupings and detect anomalies through reconstruction error and dimensionality reduction.",
        skills: ["Python", "Machine Learning", "K-Means", "PCA", "Clustering"],
      },
      {
        id: "no2",
        title: "Air Quality Forecasting (NO₂)",
        period: "2024",
        githubUrl: LINKS.repos.airQuality,
        description:
          "Time-series forecasting of NO₂ concentration comparing Linear Regression, Random Forest and a Persistence baseline; temporal feature engineering and Time Series cross-validation, evaluated with MSE and MAE.",
        skills: ["Python", "Machine Learning", "Pandas", "Scikit-learn", "Time Series"],
      },
      {
        id: "dijkstra",
        title: "City Map Shortest Path Dijkstra in C",
        period: "Aug - Dec 2024",
        githubUrl: LINKS.repos.dijkstra,
        description:
          "Modeling a city map as a graph and computing the shortest path between origin and destination with Dijkstra's algorithm, using adjacency lists and a priority queue (min-heap).",
        skills: ["C", "Algorithms", "Data Structures", "Graphs", "Dijkstra"],
      },
    ],
  },

  contact: {
    heading: "CONTACT",
    ariaLabel: "Contact",
    lead: "Open to opportunities, collaborations and conversations about applied AI, software engineering and innovation. Email is the best way to reach me.",
    ctaLabel: "Let's talk",
    mailtoSubject: "Contact via portfolio",
    copyLabel: "Copy email",
    copiedLabel: "Copied!",
    copyToast: "Email copied to clipboard.",
    copyFailedToast: "Couldn't copy. Use the email button instead.",
    linkedinLabel: "LinkedIn",
    githubLabel: "GitHub",
  },

  footer: {
    text: "Antonio Neto. Copyright © 2025-2026. All rights reserved.",
  },

  ui: {
    scrollToTop: "Back to top",
    languageToggle: "Select language",
  },
};
