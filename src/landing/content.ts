export const profile = {
  name: "Antonio Neto",
  linkedin: "https://www.linkedin.com/in/antoniosfn",
  github: "https://github.com/antoniosfn",
  headline: ["Conecte o que sabe.", "Construa o que falta."],
  intro:
    "Sou Antonio Neto. Desenvolvo busca com IA, automações e aplicações que conectam o conhecimento da sua empresa ao trabalho de quem precisa dele.",
  invitation: "Vamos conectar as ideias",
};

export const chapters = [
  {
    number: "01",
    label: "A base / Matemática",
    title: "Antes de construir, entender.",
    body: "Minha trajetória tem uma base em Matemática. É o ponto de partida para olhar um problema, identificar relações e organizar o raciocínio antes de escolher uma ferramenta.",
    note: "Licenciatura em Matemática",
    symbol: "∑",
  },
  {
    number: "02",
    label: "A ponte / Engenharia",
    title: "Dar forma ao raciocínio.",
    body: "Na Engenharia de Computação, ainda em formação, aprofundo a conexão entre teoria e construção. No desenvolvimento full-stack, essa conexão ganha interface, integração e dados.",
    note: "Engenharia de Computação em andamento",
    symbol: "{ }",
  },
  {
    number: "03",
    label: "A aplicação / IA & negócios",
    title: "Fazer a tecnologia trabalhar.",
    body: "Hoje, atuo na interseção entre pesquisa aplicada e software. Desenvolvo busca semântica, agentes de IA e automações para tornar o conhecimento acessível e o trabalho mais útil.",
    note: "IA aplicada · Software · Integração de dados",
    symbol: "↗",
  },
];

export const challenges = [
  {
    id: "conhecimento",
    number: "01",
    label: "Conhecimento disperso",
    title: "Sua empresa sabe mais do que consegue encontrar.",
    body: "Documentos, pesquisas e sistemas guardam informação valiosa. A busca por contexto ajuda a conectar o que está separado.",
    approach: "Busca semântica + integração de fontes",
  },
  {
    id: "automacao",
    number: "02",
    label: "Rotinas repetitivas",
    title: "O tempo da equipe merece um trabalho melhor.",
    body: "Coletar, conferir e organizar dados pode consumir o dia. A automação começa pelo entendimento da rotina e das exceções que ela precisa tratar.",
    approach: "Python + APIs + execução determinística",
  },
  {
    id: "produto",
    number: "03",
    label: "Uma ideia para tirar do papel",
    title: "Uma boa ideia precisa encontrar a operação.",
    body: "Uma aplicação precisa conversar com pessoas, processos e sistemas. A construção começa com um recorte claro do problema e uma primeira entrega que possa ser avaliada.",
    approach: "React + serviços + banco de dados",
  },
];

export const projects = [
  {
    number: "01",
    kind: "IA aplicada / Pesquisa",
    title: "Conhecimento que se encontra.",
    description:
      "Portal de busca semântica que reúne produção científica, competências e projetos em uma experiência de pesquisa.",
    benefit:
      "O significado da pergunta ajuda a encontrar informações relacionadas, além da correspondência entre palavras.",
    contribution:
      "Agentes de IA, integração de dados e desenvolvimento da aplicação.",
    detail:
      "Integração de fontes heterogêneas, busca com embeddings e interface para explorar informações relacionadas. Atuação do tratamento dos dados à experiência de consulta.",
    tags: ["RAG / LangChain", "React", "PostgreSQL"],
  },
  {
    number: "02",
    kind: "Automação / Dados",
    title: "Aprender uma vez. Executar de novo.",
    description:
      "Motor de coleta assistido por IA que cria instruções de extração reutilizáveis para cada fonte.",
    benefit:
      "As coletas seguintes reaproveitam as instruções, reduzindo a dependência de novas chamadas ao modelo.",
    contribution:
      "Extração com LLM, execução determinística e recuperação de falhas.",
    detail:
      "O modelo auxilia na criação de uma receita de extração por fonte. As próximas coletas executam essa estrutura, com mecanismos de recuperação quando o conteúdo muda.",
    tags: ["Python", "LLM", "APIs REST"],
  },
];

export const steps = [
  {
    number: "01",
    title: "Contexto primeiro.",
    body: "Entender o processo, ouvir a equipe e definir o problema que vale resolver.",
    output: "Problema e objetivo claros",
  },
  {
    number: "02",
    title: "Um recorte viável.",
    body: "Avaliar fontes, integrações e limites técnicos. Escolher uma primeira entrega com critério.",
    output: "Escopo e critérios de avaliação",
  },
  {
    number: "03",
    title: "Construir e avaliar.",
    body: "Desenvolver, testar o comportamento e comparar a entrega com o objetivo combinado.",
    output: "Aplicação e próximos passos",
  },
];

export const faqs = [
  {
    question: "Preciso saber qual tecnologia usar?",
    answer:
      "Você pode começar pelo problema de negócio. As tecnologias são escolhidas depois de entender os dados disponíveis, os sistemas envolvidos e o que a equipe precisa fazer.",
  },
  {
    question: "Todo projeto precisa de inteligência artificial?",
    answer:
      "A escolha depende do problema. Regras claras, integrações e automações convencionais podem atender bem à necessidade. A IA entra quando sua aplicação faz sentido para o contexto.",
  },
  {
    question: "É possível trabalhar com os sistemas que já usamos?",
    answer:
      "O primeiro passo é avaliar APIs, formatos de dados, permissões e limites de cada sistema. Essa análise define quais integrações são viáveis e o que precisa ser adaptado.",
  },
  {
    question: "Como são definidos prazo e investimento?",
    answer:
      "Dependem do escopo, da disponibilidade dos dados e da complexidade das integrações. A conversa inicial serve para entender essas condições antes de definir uma proposta.",
  },
  {
    question: "Posso ver o código dos projetos apresentados?",
    answer:
      "Os dois projetos profissionais têm código privado. No GitHub, compartilho estudos públicos de algoritmos, análise de dados e Machine Learning que complementam esta apresentação.",
  },
];

/** Provisional copy: the closing figure of the field presents Lia. */
export const lia = {
  eyebrow: "08 / LIA",
  title: "Conheça a Lia.",
  tagline: "UMA AGENTE DE IA PARA EMPRESAS.",
  body: "Tudo o que veio antes converge aqui: matemática, engenharia e IA aplicada reunidas em uma agente pensada para colocar o conhecimento da sua empresa para trabalhar.",
  invitation: "Quero conhecer a Lia",
};
