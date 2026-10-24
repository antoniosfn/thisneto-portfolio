# Antonio Neto · Refero redesign

## Escopo

Reconstrução da landing page em Next.js 16 com base na referência pública “Your workplace has the answer. Just ask Dala for it.” do Refero. O conteúdo profissional de Antonio Neto continua sendo a fonte factual; o template orienta composição, tokens, ritmo e movimento. Nenhum deploy ou recurso Cloudflare foi criado ou alterado.

## Pesquisa Refero

- Referência principal: Dala / deep-space holo-deck.
- Referências secundárias: Active Theory para precisão dos controles flutuantes e Midjourney para o uso de um visual generativo sempre ativo.
- Padrões preservados: canvas preto absoluto, manchetes grandes em peso regular, texto de apoio leve, um único CTA violeta por vista, detalhes âmbar e campo procedural de partículas.
- Adaptação: os fragmentos triangulares deixam de formar apenas um cérebro e passam por seis formações ligadas à narrativa do portfólio.

## Reference lock

- Base: `#000000` em todas as seções, sem cartões ou superfícies cinza.
- Tipografia: Space Grotesk local como substituta geométrica; títulos em peso 400, tracking negativo e escala como principal recurso de hierarquia.
- Ação: `#8052ff` apenas em CTAs principais; `#ffb829` em labels e sinais; `#15846e` apenas nas partículas.
- Formas: raio de 24px/pílula em controles e retrato; o conteúdo permanece solto no vazio.
- Mídia: canvas 2D procedural com triângulos multicoloridos; fotografia somente no retrato do autor.
- Rejeitados: grades genéricas de cards, painéis com sombra, fundos violeta, múltiplos botões preenchidos e gradientes em componentes.

## Decisões

| Decisão                    | Fonte                    | Papel preservado    | Motivo                                                                        |
| -------------------------- | ------------------------ | ------------------- | ----------------------------------------------------------------------------- |
| Fundo preto fixo           | Dala                     | Canvas dominante    | Mantém a sensação de vazio e deixa as partículas carregarem a energia visual. |
| Campo de triângulos        | Dala                     | Imagem de marca     | Reproduz o efeito central sem copiar mídia ou código da referência.           |
| Morfismo por scroll        | Pedido do usuário + GSAP | Movimento narrativo | O fundo responde à seção e ao progresso, não apenas ao tempo.                 |
| CTA violeta                | Dala                     | Ação principal      | Preserva a disciplina cromática da referência.                                |
| Labels âmbar               | Dala                     | Ênfase auxiliar     | Separa contexto e metadados sem competir com o CTA.                           |
| Controles compactos        | Active Theory            | Navegação           | Traz precisão à interface fixa.                                               |
| Visual generativo contínuo | Midjourney               | Atmosfera           | Mantém o site vivo entre as formações principais.                             |

## Arquitetura de movimento

`ParticleField.tsx` renderiza um canvas fixo responsivo. Cada partícula possui valores determinísticos e pode ocupar seis formações: massa neural, constelação dispersa, órbita, faixa ondulatória, espiral e fluxo senoidal. O `ScrollTrigger` atualiza estágio, progresso e progresso global; o renderer interpola os alvos e reage suavemente ao ponteiro. A densidade é reduzida no mobile, o DPR é limitado a 1.5 e o modo de movimento reduzido remove a deriva temporal.

As revelações de conteúdo usam somente `transform` e `opacity`, com `useGSAP` escopado para limpeza automática. O HTML essencial continua pré-renderizado e legível sem JavaScript.

## Conteúdo

O fluxo foi reorganizado em: posicionamento → manifesto → trajetória → desafios → projetos → processo → autor → perguntas → conversa. Textos factuais e dados de projeto continuam centralizados em `src/landing/content.ts`; não foram inventados clientes, resultados, prazos ou métricas.

## Validação

- TypeScript sem erros.
- Build estático do Next.js concluído.
- 18 testes Playwright aprovados em desktop e mobile.
- Cobertura E2E para ausência de overflow entre 320 e 1920 px, mudança real do canvas após scroll, interação dos desafios, FAQ, detalhes de projeto, foco no CTA, movimento reduzido, conteúdo sem JavaScript e assets locais.
- QA visual em 1440 × 900 e iPhone 13, incluindo hero e seção de projetos.

## Refinamento — 23/10/2026

Referência confirmada pela extensão Chrome na sessão do usuário: https://styles.refero.design/style/e5f5f8cf-e68d-4ed1-bbf5-6b67569af648. O conector Refero retornou INVALID_STYLE_UUIDS; a página autenticada e o original Dala foram consultados diretamente.

Decisões desta revisão:
- Preservar fundo preto, composição tipográfica à esquerda e cérebro procedural à direita, partículas triangulares, CTA violeta e labels âmbar.
- Substituir o renderer Canvas 2D por WebGL direto: cinco atributos imutáveis enviados uma vez, interpolação em shader e uma chamada de desenho por frame. Não foi adicionada dependência gráfica.
- Formações: hemisférios neurais, dispersão, lâmpada e esfera. São reconstruções procedurais próprias, não os modelos originais do Dala.
- Manter Next.js com exportação estática. Não foi possível confirmar a stack completa do original; não há benchmark que justifique migrar o framework.
- Reduzir duração aparente dos reveals e espaços excessivos; eliminar a camada de ruído com blend e a reserva permanente de camadas com will-change.
- Pausar o renderer com aba oculta; movimento reduzido desenha uma composição estática. DPR limitado a 1,5; densidade inicial de 2.400 partículas mobile e 5.600 desktop. Sem WebGL, o conteúdo permanece legível, sem a decoração.
- Copy: conectar conhecimento disperso a busca, automação e aplicações; CTA final pergunta o que o visitante quer fazer funcionar. Fatos profissionais preservados.

Não houve deploy nem alteração de recursos Cloudflare. Melhoria arquitetural de custo de renderização não equivale a uma medição comparativa de FPS com o original.

## Correção do efeito de scroll — 23/10/2026

Refero retornou a referência Dala com o ID `ba81bf2a-a5ad-4234-92a4-1d6d47742785`. Foram consultadas também OHZI e David Kirschberg. A direção existente continua sendo a referência principal: preto absoluto, partículas triangulares, cores reservadas aos seus papéis e hierarquia tipográfica preservada.

| Decisão | Fonte | Papel | Motivo |
| --- | --- | --- | --- |
| Restaurar seis geometrias e interpolá-las no shader | Dala + direção existente | Mídia procedural narrativa | O shader anterior mantinha o cérebro e só deslocava sua posição no começo. |
| Derivar estágio e interpolação de uma única posição de scroll | Pedido do usuário + GSAP ScrollTrigger | Continuidade | Evita conflitos entre callbacks ao voltar ou saltar seções. |
| Recalcular após mudanças de altura | GSAP ScrollTrigger | Sincronização | FAQ, detalhes, fontes e texto variável podem deslocar os pontos de transição. |
| Permitir ativação explícita quando o sistema reduz movimento | Refero, guia de motion + observação na aba aberta | Controle do visitante | O navegador do usuário sinalizava movimento reduzido; a opção estática ocultava o efeito esperado. |

O controle de movimento fica no canto inferior e persiste a escolha localmente. Sem escolha explícita, a preferência do sistema prevalece. O modo reduzido congela a composição; o modo ativo interpola cérebro, dispersão, lâmpada, esfera, órbitas e onda ao longo das seções.

Os testes de regressão congelam o relógio do renderer e isolam o canvas, verificando que a geometria muda pelo scroll, retorna à mesma imagem no sentido inverso e responde à roda do mouse mesmo quando o visitante ativa a animação sobre a preferência reduzida do sistema. Também cobrem persistência da escolha e progresso após expansão do conteúdo.

Validação final: TypeScript e build estático aprovados; 26 testes Playwright aprovados na exportação de produção, em desktop e mobile. Na aba do usuário, a preferência reduzida foi identificada e o efeito foi ativado pelo controle visível; a transformação e seu retorno foram conferidos com rolagem real. Nenhum deploy ou recurso Cloudflare foi alterado.

## Revisão com o briefing detalhado de partículas

A implementação atual substitui os sprites triangulares por tetraedros WebGL2 instanciados, adiciona distribuição espacial de cor, continentes simplificados e uma forma final derivada da marca própria. A sequência passa por cérebro, cérebro ampliado, dispersão, lâmpada, globo, repouso e símbolo do portfólio. O enquadramento e a organização do texto foram adaptados para desktop e mobile. Os detalhes, fontes, decisões de UX e limites da reconstrução estão em [particle-experience.md](particle-experience.md).

Esta revisão foi validada com build estático e 29 testes aprovados, com um teste de hover dispensado no mobile. Foram conferidos o retorno exato após hover, o contato sem WebGL2, a recuperação do contexto e capturas em GPU Intel e SwiftShader. Os valores e descrições de renderer nas seções anteriores registram a evolução histórica e são substituídos pelos detalhes da revisão atual. Sem deploy ou alteração de recursos Cloudflare.
