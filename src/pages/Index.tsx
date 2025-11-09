import {
  Cloud,
  Container,
  Database,
  Code,
  Terminal,
  Cpu,
  FileCode,
  Brain,
  LineChart,
  Table,
  Eye,
  Server,
  Flame,
} from "lucide-react";
import { Icons } from "@/components/ui/icons";
import { SocialLink } from "@/components/SocialLink";
import { ExperienceItem } from "@/components/ExperienceItem";
import { ProjectCard } from "@/components/ProjectCard";
import { EducationItem } from "@/components/EducationItem";
import { SkillBadge } from "@/components/SkillBadge";
import { CertificationItem } from "@/components/CertificationItem";
import { LanguageBadge } from "@/components/LanguageBadge";
import { SoftSkillBadge } from "@/components/SoftSkillBadge";
import { TechStackItem } from "@/components/TechStackItem";
import { ScrollToTop } from "@/components/ScrollToTop";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <motion.div
        className="max-w-[600px] mx-auto px-10 py-24"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
      >
        <motion.header
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-[27px] font-medium mt-0 mb-2">Antonio S. F. Neto</h1>
          <p className="text-[17px] mt-2 mb-0 leading-relaxed">
            Transformação Digital e Inovação | Robótica Competitiva | Matemático | Cursando Engenharia de Computação
          </p>
        </motion.header>

        <motion.ul
          className="flex gap-2.5 mt-4 mb-0 p-0"
          aria-label="Links Sociais"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.5 }}
        >
          <li className="list-none">
            <a
              href="https://github.com/antoniosfn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-muted-foreground hover:text-accent transition-colors"
            >
              <Icons.github className="w-6 h-6" />
            </a>
          </li>
          <li className="list-none">
            <a
              href="https://www.linkedin.com/in/antoniosfn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="text-muted-foreground hover:text-accent transition-colors"
            >
              <Icons.linkedin className="w-6 h-6" />
            </a>
          </li>
        </motion.ul>

        <motion.section
          className="mt-8"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-wrap gap-2.5">
            <LanguageBadge language="Português BR" level="Nativo" />
            <LanguageBadge language="Inglês" level="Profissional" />
          </div>
        </motion.section>

        <motion.section
          className="mt-8"
          aria-label="Soft Skills"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-wrap gap-2.5">
            <SoftSkillBadge skill="Autodidata" icon="🎓" />
            <SoftSkillBadge skill="Comunicativo" icon="💬" />
            <SoftSkillBadge skill="Trabalho em Equipe" icon="🤝" />
            <SoftSkillBadge skill="Proatividade" icon="⚡" />
          </div>
        </motion.section>

        <motion.section
          className="mt-8"
          aria-label="Experiência"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-[21px] font-medium mb-4">EXPERIÊNCIA</h2>
          <ExperienceItem
            title="Bolsista Técnico em Transformação Digital"
            company="HOTMILK | Ecossistema de Inovação da PUCPR"
            period="ago 2025 - Presente"
            description="Pesquisa, Desenvolvimento e Inovação focado em transformação digital e otimização de processos operacionais no NIT (Núcleo de Inovação Tecnológica)."
          />
          <ExperienceItem
            title="Membro de Equipe Técnica"
            company="Equipe PUCPR de Robótica Móvel"
            period="abr 2023 - Presente"
            description="Experiência Interdisciplinar (Liderança, Finanças, Marketing, Eletrônica e Programação). Resultados notáveis em Robótica: Líder de Projeto do 'Lupa' (Segundo Lugar | Copa Pinhão 2025) e desenvolvedor do 'Relâmpago Marquinhos' (Terceiro lugar | Salão de Robótica 2023)."
          />
          <ExperienceItem
            title="Técnico em Manutenção e Suporte em Informática"
            company="IDEPLAN - Instituto de Defesa do Planejamento e Desenvolvimento Urbano Sustentável"
            period="jan 2020 - dez 2020"
            description="Suporte aos colaboradores, manutenção de computadores, instalação de sistemas operacionais e configuração de redes. Conceição do Araguaia, Pará."
          />
        </motion.section>

        <motion.section
          className="mt-8"
          aria-label="Formação Acadêmica"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-[21px] font-medium mb-4">FORMAÇÃO ACADÊMICA</h2>
          
          <Accordion type="multiple" defaultValue={["em-andamento"]} className="w-full">
            {/* Em Andamento */}
            <AccordionItem value="em-andamento">
              <AccordionTrigger className="text-[17px] font-semibold text-muted-foreground hover:no-underline">
                Em Andamento
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  <EducationItem
                    degree="MBA em Tecnologia para Negócios: AI, Data Science e Big Data"
                    institution="Pontifícia Universidade Católica do Rio Grande do Sul"
                    period="nov 2025 - Presente"
                  />
                  <EducationItem
                    degree="Bacharel em Engenharia de Computação"
                    institution="Pontifícia Universidade Católica do Paraná"
                    period="2023 - Presente"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Concluído */}
            <AccordionItem value="concluido">
              <AccordionTrigger className="text-[17px] font-semibold text-muted-foreground hover:no-underline">
                Concluído
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  <EducationItem
                    degree="Licenciatura Plena Matemática"
                    institution="Universidade do Estado do Pará"
                    period="2018 - 2021"
                    completed
                    details="Monografia: 'Números Primos na Proteção de Dados Virtuais: Criptografia RSA e suas Aplicações na Internet'"
                  />
                  <EducationItem
                    degree="Técnico em Manutenção e Suporte em Informática"
                    institution="Instituto Federal de Educação, Ciência e Tecnologia do Pará"
                    period="2020 - 2021"
                    completed
                  />
                  <EducationItem
                    degree="Ensino Médio Integrado em Edificações"
                    institution="Instituto Federal de Educação, Ciência e Tecnologia do Pará"
                    period="2015 - 2017"
                    completed
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.section>

        <motion.section
          className="mt-8"
          aria-label="Tecnologias e Ferramentas"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-[21px] font-medium mb-4">TECNOLOGIAS E FERRAMENTAS</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            <TechStackItem name="AWS" icon={Cloud} />
            <TechStackItem name="Docker" icon={Container} />
            <TechStackItem name="PostgreSQL" icon={Database} />
            <TechStackItem name="JavaScript" icon={Code} />
            <TechStackItem name="Node.js" icon={Server} />
            <TechStackItem name="TypeScript" icon={FileCode} />
            <TechStackItem name="React" icon={Icons.react} />
            <TechStackItem name="Python" icon={FileCode} />
            <TechStackItem name="Pandas" icon={Table} />
            <TechStackItem name="PySpark" icon={Flame} />
            <TechStackItem name="Scikit-learn" icon={LineChart} />
            <TechStackItem name="TensorFlow" icon={Brain} />
            <TechStackItem name="OpenCV" icon={Eye} />
            <TechStackItem name="C" icon={Terminal} />
            <TechStackItem name="Arduino" icon={Cpu} />
          </div>
        </motion.section>

        <motion.section
          className="mt-8"
          aria-label="Projetos"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-[21px] font-medium mb-4">PROJETOS</h2>
          <ProjectCard
            title="City Map Shortest Path Dijkstra in C"
            period="ago - dez 2024"
            description="Implementação do algoritmo de Dijkstra para calcular o menor caminho em mapas urbanos modelados como grafos. Utiliza listas de adjacência e fila de prioridade (min-heap) para otimização de rotas."
            skills={["C", "Algoritmos", "Estruturas de Dados", "Grafos", "Dijkstra"]}
            githubUrl="https://github.com/antoniosfn/City-Map-Shortest-Path-Dijkstra-in-C"
          />
          <ProjectCard
            title="Previsão da Qualidade do Ar (NO₂)"
            description="Análise de séries temporais para prever concentração de NO₂ comparando Regressão Linear e Random Forest. Inclui engenharia de features temporais e validação cruzada TimeSeriesSplit com avaliação por MSE/MAE."
            skills={["Python", "Machine Learning", "Pandas", "Scikit-learn", "Time Series"]}
            githubUrl="https://github.com/antoniosfn/Predicting-Air-Quality-NO-using-Linear-Regression-and-Random-Forest"
          />
          <ProjectCard
            title="Detecção de Anomalias com K-Means e PCA"
            description="Aplicação de clustering K-Means e PCA no dataset California Housing para identificar agrupamentos naturais e detectar anomalias através do erro de reconstrução e redução dimensional."
            skills={["Python", "Machine Learning", "K-Means", "PCA", "Clustering"]}
            githubUrl="https://github.com/antoniosfn/California-Housing-Anomaly-Detection-with-K-Means-and-PCA"
          />
        </motion.section>

        <motion.footer
          className="mt-12 pt-8 border-t border-border text-center"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[14px] text-muted-foreground">
            Antonio Neto. Copyright © 2025-2026. Todos os direitos reservados.
          </p>
        </motion.footer>
      </motion.div>

      <ScrollToTop />
    </div>
  );
};

export default Index;
