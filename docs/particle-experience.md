# Experiência de partículas — revisão de 24/10/2026

A fonte de verdade desta revisão é [o relatório fornecido](reference/dala-measurements.json), preservado integralmente. A referência visual do Refero é Dala, estilo `ba81bf2a-a5ad-4234-92a4-1d6d47742785`, consultado no conector. A página pública permaneceu no carregamento durante a captura; isso impede uma comparação visual direta do modelo original.

## Revisão 8 — repouso e cena inteira

- **Repouso** (`particles/stillness.ts`): o movimento involuntário (flutuação de vácuo do conjunto e de cada partícula, órbitas, balanço, água, fumaça, tombo dos triângulos) segue um relógio ambiente `u_clock`. Ele desacelera até parar em cerca de 0,5 s quando a forma está completa (progresso inteiro, sem explosão e sem a semente reunida) e retoma de onde parou ao começar uma transição. Hover, scroll, explosões e correntes não usam esse relógio. Só os estilhaços do fundo continuam à deriva.
- **Cena final inteira:** `object-fit: contain` com 80% da tela e elevada 0,45 unidade: o casal e os bichos ficam acima do rodapé em qualquer largura. No celular não há mais panorâmica.

## Revisão 7 — matemática, marca, tipografia e corpo

- **Auditoria matemática** (agente de revisão, resultados conferidos contra as referências): `stagger`, rampas da linha do tempo (janelas disjuntas, soma exata em 9), `axisAngle` (Rodrigues), SDFs de Quílez, `curl`, empacotamento alfa+emissão e a câmera conferem. Corrigido:
  - `quality.ts`: uma GPU presa a 33 ms desde o primeiro quadro nunca baixava a resolução, porque o "melhor quadro" era tomado como cadência da tela. Agora só conta como cadência se estiver perto do orçamento.
  - hover: o termo de velocidade era `abs(max(Δx, Δy))`, assimétrico por direção. Passou a `max(|Δx|, |Δy|)`.
  - mola: com atrito 0,892, `|λ| = √0,892` para qualquer k > 0,0035, então k só mudava o período. O atrito agora varia por partícula (0,88–0,905), o que de fato dá tempos de assentamento diferentes.
  - loading: easing independente da taxa de quadros e limiares que chegam a 100%.
  - comentários de derivação em `sampling`, `colonize`, `atom`, `common`, `sdf`.
- **Árvore:** expoente do modelo de tubos 2,1 → 1,85 (tronco mais grosso em relação aos galhos), pontas 0,006 → 0,011, raio mínimo das barras 0,013, tronco alargado na base.
- **Lia:** ombros, caixa torácica, cintura, quadril, braços e coxas 15–30% mais largos; união suave 0,026 → 0,034.
- **Cena final:** `object-fit: cover` em qualquer tela: o fator passa a `max(largura visível / largura da cena, altura visível / altura da cena)` (`renderer.ts`). Em retrato a câmera atravessa a sobra.
- **Marca:** sai o trio de triângulos; entra a semente que vira árvore (traço contínuo, semente âmbar, três nós violeta). Cabeçalho, rodapé, favicon e loading (`MARK_PATHS`) usam a mesma geometria.
- **Tipografia:** League Spartan (títulos, rótulos, botões, pesos 600) e Inter (corpo, 400), ambas hospedadas em `public/fonts`. Tracking dos títulos de −0,05em para −0,03em, porque a Spartan já é fechada.

## Tela de loading

`src/landing/Loader.tsx` e `src/landing/loading.ts`.

Pesquisa no Refero:
- **Screens:** os loadings reais (Netflix, Luma, Riverside, Open) são um único indicador no centro de um canvas vazio.
- **Estilos:**
  - Active Theory é a base: preto puro, UI mínima na periferia, luz só nas partículas.
  - Do Regisgrumberg vem um emblema central único.
  - Do Midjourney vem a imagem que se renderiza enquanto você espera.

Como funciona:
- A marca do portfólio (os três triângulos) se monta com 240 fragmentos triangulares vazados, as mesmas partículas do campo, na proporção do progresso real.
- O progresso vem dos bytes do `forms.bin` lidos em streaming (85%), e os dois primeiros quadros do campo fecham o resto.
- O contador fica no canto inferior direito, em numerais tabulares, com o nome no canto esquerdo.
- Aos 100%, os fragmentos se dispersam para fora enquanto o campo entra.
- **Fica no mínimo 0,9 s na tela:** quem volta com cache ainda vê a marca se formar.
- **Garantias:**
  - sai em no máximo 12 s, por JavaScript, e em 14 s por CSS, se o script falhar;
  - sem JavaScript, um `<noscript>` esconde a tela;
  - sem WebGL, sai assim que o campo desiste.
- O scroll fica travado durante o loading (`html.is-loading`).
- O tempo usa `performance.now()`, então o loading sai mesmo quando a página congela o relógio de animação.

## Revisão 6 — definição, hover 3D, formas novas e a Lia

Pedido do Antonio (24/10/2026), com 14 imagens de referência, guardadas em [reference/v6-targets](reference/v6-targets). As capturas de antes e depois estão em [reference/v6-before](reference/v6-before) e [reference/v6-after](reference/v6-after), geradas por `node scripts/capture-stages.mts <pasta>`.

### O que mudou

| Pedido | Solução |
| --- | --- |
| Hover preso ao mouse, sem profundidade | O ponteiro vira um raio 3D. Uma passada de sonda grava num pixel, com blending MIN, a profundidade da partícula mais próxima do raio: a superfície da frente da figura. Só a camada nessa profundidade reage, abrindo uma cratera ao longo do raio. Fora da figura, nada se mexe (`particles/hover.ts`, `shaders/hover.ts`). |
| Baixa definição, cinza sob o mouse | Pixel ratio adaptativo de até 2 (até 1,5 no celular), que só desce, em degraus, se o quadro passar de 19 ms (`quality.ts`). 16 384 partículas (antes 10 000). O hover deixou de misturar cinza: agora clareia. |
| Saturação | Ganho de saturação de 1,32 no fragmento e emissão por partícula no canal alfa do atlas de cor. O bloom subiu o limiar para 0,42, para que só os pontos emissivos brilhem e a forma densa não vire uma massa branca. |
| Preto AMOLED | A última passada zera tudo abaixo de 3/255. O teste `background is true black` confere que não sobra névoa quase preta. |
| Movimento de vácuo | Flutuação do campo inteiro em 0,21, 0,33 e 0,47 Hz (`motion.ts`, `vacuum`), deriva lenta por partícula e deriva dos estilhaços do fundo. |
| Fragmentos espalhados por pouco tempo, depois fluxo organizado | Nuvem do manifesto mais curta (1,15 → 1,45). Em qualquer transição ou explosão, o alvo segue uma corrente de curl noise, ponderada por `st·(1−st)`. |
| Figuras da Trajetória antes, maiores e mais espaçadas | Cada forma completa antes de o capítulo centralizar (por exemplo, Lorenz em 2,15 → 2,75). Escalas +15–20%. Capítulos com 112vh no desktop e 100vh no celular. |
| Cubo maior | Escala de 0,46 para 0,6. Ficou sem linhas de luz, que engrossavam as barras. |
| Grandes no celular | Fator de 3,0 (antes 2,2), partículas 1,5× e fundo 0,11 (antes 0,075). |
| Organização | `src/landing/particles/`: renderer, simulation, post, quality, hover, lines, timeline, `shaders/` e `forms/`, com um arquivo por forma. |

### Fluxo

| f | Seção | Forma |
| --- | --- | --- |
| 0–1 | Hero, Manifesto | Nó trefoil |
| 2 | Linha do manifesto | Nuvem curta → corrente |
| 3–5 | Trajetória | Lorenz, treliça, rede |
| 6 | Desafios | Cubo |
| 7 | Projetos (título) | O cubo explode; fila indiana até o centro, dois fios torcidos que se dividem em quente e frio |
| 8–9 | Projeto 01, 02 | Livro semiaberto (vermelho, âmbar, branco, com fagulhas) no alto à direita e átomo (azul e roxo) embaixo à esquerda; uma folha vira por projeto |
| 10 | Processo | Os dois se juntam no centro, descem e chovem para baixo, formando a semente; a Árvore da Vida cresce de dentro para fora, em espiral de galáxia |
| 11–12 | Quem constrói, FAQ | Árvore com as 10 sefirot e os 22 caminhos |
| 13 | Lia | A figura da Lia |
| 14 | Contato | A cena final: cachoeira, casa e casal, formada a partir do casal ([particle-finale.md](particle-finale.md)) |

### Formas novas

Cada forma foi reconstruída a partir da imagem correspondente, seguindo o método da skill `img2threejs`: análise da imagem do geral para o detalhe, lista dos traços que definem a identidade, construção em passes e comparação de cada render com a referência. O pipeline de estado e gates da skill (material PBR, rig, CS2) não se aplica a amostras de partículas e não foi usado.

- **Fluxo** (`forms/stream.ts`): caminho calculado no shader, porque as pontas seguem o livro e o átomo em qualquer layout.
- **Livro** (`forms/book.ts`): a folha de cima de cada lado é superfície; o bloco embaixo aparece pelas linhas empilhadas da cabeça, do pé e da borda. Tem linhas de texto, capa vermelha e uma coluna de fagulhas que sobe do sulco.
- **Átomo** (`forms/atom.ts`): núcleo de poliedros em cristal, três órbitas de 2,8 : 1 a 60° uma da outra e cinco elétrons com cauda de cometa. Livro e átomo giram para encarar a câmera (`u_bookFace`, `u_atomFace`).
- **Árvore** (`forms/tree.ts`): copa e raízes crescidas por colonização de espaço (Runions, 2007), tronco que se alarga em direção às raízes e galhos coloridos por lado (dourado e violeta à esquerda, azul e teal à direita). Sefirot como estrelas tetraédricas dentro de icosaedros. O rank de chegada é o comprimento do caminho até a semente.
- **Lia** (`forms/woman.ts`): corpo por SDF (união suave de elipsoides e cápsulas afiladas, cânone de 8 cabeças), cabelo em mechas esvoaçantes, 7 chakras, dois anéis e uma aura. Partículas menores e malha de linhas de luz (`FORM_LOOK`). É estilizada: uma imagem gerada por IA tem detalhe anatômico que 16 mil partículas não reproduzem.

O alvo também é animado: órbitas, elétrons, folha virando, fagulhas, cabelo, chakras e anéis (`shaders/motion.ts`). Por isso as linhas de luz, que leem as posições simuladas, acompanham o movimento.

`?f=10.5` na URL fixa o campo nesse progresso de seção, para revisão.

## Revisão 5 — brilho e paleta

O brilho estava intenso e o branco dominava. Medimos isso nas capturas: fração quase branca dos pixels acesos (mínimo dos canais > 0.78), saturação média, brilho médio e área acesa, no recorte de cada forma.

| | Dala (hero e introdução) | Antes | Agora |
| --- | --- | --- | --- |
| Pixels quase brancos | 0.7–0.9% | 25–49% | 0.1–0.5% |
| Saturação média | 0.38–0.41 | 0.13–0.37 | 0.45–0.67 |
| Brilho médio dos pixels acesos | 0.46–0.50 | 0.76–0.80 | 0.64–0.67 |
| Área acesa, com halo | 0.24–0.39 | 0.50–0.77 | 0.29–0.38 |

O branco agora vem só da marca, onde é a cor do triângulo central e por isso é intencional (18% no recorte do contato). Três mudanças levaram a esses números:

1. **Paleta:** o branco saiu das rampas. Entraram o azul #3F6BFF e o magenta #D94DE0, as outras duas cores da paleta observada na Dala. Ficaram assim:
   - nó em violeta → magenta → azul → teal, com borda dourada;
   - asas do Lorenz se encontrando em magenta;
   - treliça e cubo em teal → azul → violeta;
   - camadas da rede em teal, azul, violeta e dourado.

   O branco volta como faísca em 7% das partículas, como no interior do cérebro da Dala; a marca fica de fora.
2. **Fator de cor:** caiu de 1.3 para 0.8 (`COLOR_FACTOR`). O 1.3 da Dala estourava os canais das nossas cores saturadas em direção ao branco, porque nossas formas têm mais sobreposição que o cérebro dela.
3. **Bloom:** a intensidade caiu de 0.4 para 0.2; raio 1 e limiar 0.159 continuam iguais aos da Dala.

São desvios conscientes dos valores da Dala, escolhidos para reproduzir o resultado medido dela e não o parâmetro. A primeira nuvem mostra 188 triângulos visíveis. A nuvem das seções de leitura mostra 65, rarefeita de propósito.

## Revisão 4 — novas formas (substitui cérebro, lâmpada e globo)

A comparação visual deu 4/10 contra a Dala. O movimento já era o dela (linha do tempo, mola, câmera, scroll e bloom), mas as formas, não. A Dala amostra de modo uniforme modelos 3D esculpidos. As nossas eram fórmulas com pontos aleatórios, e o cérebro procedural era o pior caso. Esta revisão troca as formas por geometria que dá para construir com exatidão em código, sem animais.

### Fluxo

| f | Seção | Forma | Lado da copy | Movimento |
| --- | --- | --- | --- | --- |
| 0 | Hero | Nó trefoil (2, 3) | esquerda | quase frontal (−1.15 rad) |
| 1 | Manifesto | Nó trefoil | direita | gira até ficar frontal e cresce 1 unidade de fator |
| 2 | Contexto → clareza → aplicação | Nuvem | centro | explode, com a crista no topo |
| 3 | Trajetória · Matemática | Atrator de Lorenz (σ 10, ρ 28, β 8/3) | direita | condensa, com 0.35 rad de yaw |
| 4 | Trajetória · Engenharia | Treliça geodésica (icosfera de frequência 2) | direita | transição escalonada |
| 5 | Trajetória · IA | Rede neural 4–7–7–3 | direita | transição escalonada |
| 6 | Desafios | Cubo 3×3×3 no meio de um movimento (camada superior girada 30°) | esquerda | vista de canto (π/4, 0.5 rad) |
| 7–10 | Projetos até FAQ | Nuvem esparsa | — | explode e dá meia volta |
| 11 | Contato | Marca do portfólio | abaixo | recompõe e volta a ficar frontal |

Cada capítulo da Trajetória virou um estágio próprio (`data-particle-stage` 3–5), e o resto da página foi renumerado. A linha do tempo continua usando a gramática da Dala: mapas lineares limitados do progresso de seção, uniforms suavizados por frame, transições escalonadas por rank (atraso de 0.0005) e o objeto do lado oposto ao da copy.

### Construção das formas

`particle-shapes.ts` monta malhas exatas com geometria do Three.js:

| Forma | Geometria |
| --- | --- |
| Nó | `TorusKnotGeometry(1, 0.2, 720, 24, 2, 3)` |
| Lorenz | Tubo ao longo da trajetória integrada (5 600 passos, dt 0.004) |
| Treliça | Barras nas 120 arestas e juntas nos 42 vértices |
| Rede | Esferas nos nós e fibras de 0.008 entre camadas |
| Cubo | Arestas dos cubinhos na superfície externa (180 no total), com a camada superior girada 30° em torno de y e folga uniforme de 0.14 entre cubinhos |
| Marca | Extrusão dos três triângulos de `.brand-mark` |

Cada malha recebe 40 000 amostras ponderadas por área (`MeshSurfaceSampler`, semente fixa). Um afinamento de Poisson mantém 10 000 delas com distância mínima: começa na distância de empacotamento hexagonal para a área e reduz 8% por passada. É isso que produz os vãos regulares da Dala. As cores vêm da geometria:

- **Nó:** degradê violeta → branco → teal ao longo da linha, com dourado onde o tubo aponta para fora.
- **Lorenz:** uma asa dourada e outra violeta, que se encontram no branco.
- **Treliça:** juntas douradas.
- **Rede:** cores por camada.
- **Cubo:** a camada girada em dourado; o resto vai de teal a violeta.
- **Marca:** violeta, branco e âmbar, como no CSS.

Formas de linha (treliça, rede, Lorenz curto, cubo em arestas) leem nítidas. Superfícies densas acumulavam brilho no bloom, por isso o cubo deixou de ter faces e o Lorenz ficou com menos órbitas. O cubo também teve duas versões descartadas. Cantos girados em eixos aleatórios pareciam um defeito. Desenhar as faces expostas pelo giro empilhava três grades no topo. A versão final mostra só a grade externa; a contagem de 180 arestas foi conferida contra o cálculo à mão: 68 na camada de cima, 44 na do meio e 68 na de baixo.

### Pré-cálculo

A amostragem leva cerca de 2 s de CPU, um custo alto demais para a carga da página. `npm run particles` executa `scripts/build-particle-forms.mts`, que é determinístico, e grava `public/particles/forms.bin` com 527 KB. As posições ficam em 16 bits sobre [−1, 1], com passo de 3·10⁻⁵, e as cores em 8 bits. No navegador, `ParticleField` busca o arquivo e só então inicia o renderer. Se a busca falhar, o conteúdo continua disponível. **Depois de alterar uma forma, rode `npm run particles`.**

O atlas passou a 3×3 (300×300 RGBA float), com espaço para nove formas, e `morph` percorre as seis ativas. `FORM_SCALE` em `particle-data.ts` define quanto do raio do fator cada forma ocupa. A calibração foi visual, em 1440×900, 1280×720 e 390×844, com capturas em `artifacts/review/forms*/`.

As seções abaixo descrevem o cérebro, a lâmpada e o globo das revisões anteriores. Valem como histórico das medições da Dala, que continuam valendo para movimento, câmera, ponteiro e pós-processamento.

## Revisão 2 — comparação com o site ao vivo

A segunda revisão comparou três fontes:

- a entrada do Refero Styles `e5f5f8cf-e68d-4ed1-bbf5-6b67569af648` ("constellation floating on black velvet");
- dala.craftedbygc.com aberto no Chrome;
- o site local.

Os parâmetros abaixo foram lidos do bundle de produção (`theme.js`) e do DOM da Dala. Copiamos apenas números e comportamentos e os reimplementamos em código próprio: nenhum shader, modelo ou textura da Dala foi reutilizado. Quando esta seção diverge do restante do documento, vale esta seção.

| Aspecto | Dala (lido) | Antes | Agora |
| --- | --- | --- | --- |
| Scroll | ASScroll virtual, `ease: .075` por frame, sem suavização no toque (`touchEase: 1`) | Nativo | Lenis 1.3.26 com `lerp = −ln(1 − 0.075) = 0.0779615`. Como a Lenis aplica `1 − e^(−lerp·60·dt)`, isso dá exatamente 0.075 por frame de 60 Hz, com 95% do percurso em 38.4 frames (0.64 s). Toque nativo. Saltos por âncora usam a mesma curva |
| Linha do tempo | `f = índice da seção + \|pos − topo\| / altura`, com `pos` suavizado. Cada uniform é uma soma de mapas lineares limitados de f | Amostras em pixels da captura, interpoladas | Fórmulas exatas em `particle-timeline.ts`. Os dez estágios do portfólio caem nos marcos 0, 1, 2.2, 3, 3.5, 5, 5.2, 5.4, 5.6 e 6. Verificado com SymPy contra a tabela do relatório |
| Suavização dos uniforms | Pose a 0.1 por frame, rotação e mouse a 0.075 | Nenhuma | `easePose`, normalizada ao frame de 60 Hz |
| Câmera | `PerspectiveCamera(50, aspecto, .1, 30)` em z = 10 | FOV vertical de 40° em z = 14 | A câmera literal da Dala: FOV vertical de 50° a 10 unidades, com altura visível de 9.33 em z = 0, e o objeto em y = −1.19. Paralaxe do mouse de 0.075 rad em yaw e 0.05 rad em pitch, suavizada a 0.1 (ver "Revisão 3") |
| Ponteiro | Impulso = clamp(50·Δ NDC por evento, ±2), decaimento ×0.9 por frame, `u_mouse` e `u_delta` suavizados a 0.075 | Integrador próprio e lerp de 0.16 | A mesma cadeia em `PointerMotion` |
| Camada de fundo | 250 pirâmides com x, y ∈ [−1, 1] da área visível e z ∈ [0, 9], escala 0.05 (0.075 no mobile), paleta (93,57,154), (186,136,43), (40,116,100), (164,148,175), alfa aleatório e paralaxe de 0.25 × mouse suavizada a 0.1 | Ausente | `particle-backdrop.ts`, com a mesma geometria de pirâmide das partículas. A extensão (1.5) e o giro (0.25 rad/s) foram reconstruídos |
| Pós-processamento | `UnrealBloomPass` (threshold 0.159, strength 0.4, radius 1), bokeh com abertura 1e−5 e vinheta | Só a vinheta | Bloom com os mesmos valores, depois vinheta e `OutputPass`. O bokeh com abertura 1e−5 não produz desfoque visível e foi omitido |
| Espaço de cor | three.js anterior ao r152, sem `outputEncoding`: cores, blending e o threshold do bloom operam nos valores sRGB crus | Cores linearizadas e saída em sRGB | Pipeline em espaço de exibição: cores lidas como valores crus e saída sem conversão. Assim o threshold de 0.159 tem o mesmo significado |
| Pixel ratio | Canvas 1707×825 em DPR 1.5, ou seja, ratio 1 | min(DPR, 1.5) | 1 |
| Partículas | 10 000 (7 000 no mobile), escala 1.55 (1.2), objeto em y = −1.19, fator 4.35 (2.5) | Mobile com 4 200 e ajustes próprios | Valores da Dala. No mobile, o y é espelhado (−2) porque aqui o título fica acima da forma |
| Reveal do texto | `splitTextRotateIn`: linhas mascaradas, y 120%, origem "0 0", power3.out, stagger 0.1 com power1.in, início em "top bottom". Títulos sem rotação em 1.5 s; corpo a 7° em 0.8 s com atraso de 0.5 s; no hero, 1 s com atraso de 1 s; CTA a 2° com expo.out em 1 s e atraso de 1.5 s | Fade de 24 px vinculado ao scroll | `text-reveal.ts` com GSAP SplitText (`mask: "lines"`) e os mesmos valores |
| Composição | Copy alternando lados: hero à esquerda, introdução na coluna em 2/3, manifesto centralizado, lâmpada com copy à direita, globo com copy à esquerda, rodapé abaixo do logo | Lâmpada, globo e contato sobrepostos à copy | Colunas ajustadas (lâmpada a partir de 60%, globo até 44%) e o contato ancorado com o topo da copy em 56% da altura, abaixo do logo |

### Revisão 3 — cabeçalho, pirâmides sólidas e câmera literal

**Cabeçalho.** Lido do CSS e do bundle da Dala:

- `.header__bg` tem `overflow: hidden`, `scaleY(0)` e origem no topo.
- O interior tem `backdrop-filter: blur(20px)`, um gradiente `linear-gradient(360deg, rgba(0,0,0,.5), rgba(0,0,0,.1))` e `scaleY(1.1)` com origem embaixo.
- Quando o scroll passa de 1 px, um timeline leva a faixa a `scaleY: 1` em 1 s com `expo.out` e volta a 0 no topo.

Aqui, `.header-backdrop` ocupa a largura toda e repete esses valores. A Dala também esconde o texto do logo no modo compacto; o portfólio mantém o nome visível, porque a marca é o nome.

**Partículas.** O asset da Dala é `py-lod1.glb`, com 36 vértices e 48 triângulos. São seis prismas triangulares, um por aresta de um tetraedro, com cerca de 1.07 de extensão e cor chapada (`outgoingLight.rgb = col.rgb`). `particle-geometry.ts` constrói a mesma pirâmide do zero, sem reutilizar o arquivo. O fragment shader passou a usar cor chapada e a composição usa MSAA 4×, porque as arestas sólidas finas precisam de antialiasing. O teste de profundidade está ligado, como em geometria sólida.

**Câmera: a correção do "22.3".** O cérebro da Dala mantém de 0.68 a 0.69 da altura da tela tanto em 16:9 quanto em 2.07:1, então a trava é vertical e não horizontal. A câmera literal (FOV vertical de 50° a 10 unidades) prevê os centros sem nenhum parâmetro ajustado:

| Marco | Previsto | Medido |
| --- | --- | --- |
| Hero | 0.609 W | 0.58 W |
| Introdução | 0.267 W | 0.284 W |
| Explosão | 0.479 W | 0.48 W |

O ajuste anterior de 22.3 unidades com deslocamento de −0.31 acertava os dois primeiros marcos por construção. Foi substituído.

**Encaixe do cérebro.** Com a câmera literal, o corpo do cérebro foi comparado ao hero da Dala no mesmo estado (f = 0.12, 1568×758):

| | Dala | Antes |
| --- | --- | --- |
| Altura | 0.182–0.834 H | 0.210–0.938 H |
| Centro | perto de 0.66 W | 0.62 W |

`BRAIN_FIT` em `particle-data.ts` aplica escala de 0.896 e deslocamento de (+0.8, +0.665) unidades e estica o eixo lateral 1.6×. O estiramento deixa a introdução frontal tão larga quanto a da Dala. Em outro teste, normalizamos o cérebro por eixo, como o relatório descreve para o atlas, mas a perspectiva a 10 unidades o deixou 1.45× mais largo que o da Dala. Essa leitura não vale para o cérebro.

**Recalibração.** As medidas são em 1440×900, com capturas em `artifacts/review/v6/`:

| Parâmetro | Valor | Alvo do relatório | Medido |
| --- | --- | --- | --- |
| Extensão da pirâmide | 0.06 | Interior do cérebro com vãos escuros (preenchimento de 0.22 na Dala); com 0.085 ou mais o cérebro satura | Pirâmides distintas, com brilho ainda um pouco maior que o da Dala |
| Espessura das arestas | 0.06 da aresta | — | — |
| Fator radial | `3.4 + 16·r^0.9` | ~150 triângulos na nuvem total | 155 triângulos; os estilhaços perto da câmera chegam a 85 px |

**Limites.** O cérebro da Dala é um modelo amostrado de forma uniforme na superfície, e por isso mostra vãos regulares e uma frente contínua. O nosso é procedural: os hemisférios ainda aparecem separados na vista frontal e o interior fica mais luminoso. Reproduzir isso exige um modelo de cérebro próprio, não parâmetros.

### Diferenças de UI/UX que ficam como recomendação

- **Tipografia:** a Dala usa PPNeueMontreal, uma fonte comercial. Os títulos têm peso 400 com tracking de −0.04em e o corpo tem 18 px com peso 200, que o Refero aponta como assinatura. O portfólio mantém a Space Grotesk; adotar corpo em 200 exigiria uma fonte com esse peso.
- **Escala fluida:** a Dala usa uma escala fluida com base em 1440: display 7.81vw, corpo 1.25vw e coluna de 25vw.

## Decisões e autoridade

| Decisão | Fonte | Implementação |
| --- | --- | --- |
| Three.js + WebGL2 + ShaderMaterial | Medido no anexo | Three.js r186.1, sem React Three Fiber |
| Mola discreta | k=0.006, friction=0.892 | Passes separados de velocidade e posição, passo fixo de 60 Hz |
| 4 formas em atlas 2×2 | Medido | Atlas de posição, cor e escala, 200×200 RGBA float |
| 10.000 partículas | Provável no relatório | 100×100 posições e velocidades; mobile desenha 4.200 instâncias |
| Forma, cor e escala com o mesmo stagger | Medido | Mesmo encadeamento de interpolação e ranks por instância |
| Explosão radial escalonada | Medido | Multiplicação da posição por fator individual; sem alvo de nuvem independente |
| Hover circular, sem atração/repulsão | Medido | Movimento seno/cosseno local, tamanho maior, mistura com cinza 0.45 |
| Hover nulo na explosão completa | Medido | Ganho `abs(u_explode - 1)` em deslocamento, escala e cor |
| Velocidade do mouse (`u_delta`) entre 0.1 e 1.0 | Medido | Integrador com vazamento: impulso = deslocamento NDC × 1.5, decaimento 0.9 por frame de 60 Hz, limitado a [−1, 1]. Uma varredura comum fica perto de 0.3; um movimento brusco satura em 1. Assim, o raio `1.25 + |max(Δx, Δy)|` e a amplitude crescem com a velocidade. Como na fórmula medida, o raio só cresce em movimentos para a direita ou para cima. `u_mouse` usa lerp de 0.16 por frame de 60 Hz, normalizado pelo tempo do frame |
| Cérebro perfil → frontal | Medido | Y: 0 → −π/2; offset X: +3 → −4.5; fator: 4.35 → 5.25 |
| Triângulos vazados sobre quads | Provável no relatório | InstancedMesh de quads e contorno analítico antialiasado no fragment shader |
| Giro coerente | Medido | Simplex 3D com amplitude 0.619 e rotações nos eixos (1,0,1)/(0,1,1) |
| Fade por profundidade e vinheta | Medido | smoothstep(−4.5,4,z); offset 0.3, darkness 4 |
| Cores espaciais | Medido | Ouro no contorno, roxo/branco no corpo e teal na base; atlas por forma |
| Conteúdo e identidade do portfólio | Projeto existente e anexo | Mantidos; nenhum logo ou modelo da Dala foi reutilizado |

## Arquitetura

`particle-data.ts` produz os atlas e parâmetros determinísticos. `particle-shaders.ts` contém os passes de simulação, desenho e vinheta. `particle-renderer.ts` mantém dois render targets para posição e dois para velocidade. A posição lê a velocidade calculada no mesmo passo, preservando Euler semi-implícito.

`particle-timeline.ts` interpola as amostras do relatório. GSAP ScrollTrigger converte a posição real da página para essa linha do tempo. Os marcos seguem o centro do conteúdo visível e são recalculados após fontes, resize e mudanças de layout. A medição desconta o deslocamento da animação `.reveal` (y: 24 → 0). Sem esse desconto, os marcos variavam até 24 px conforme a posição do scroll no momento do refresh. Os números 0–4600 são coordenadas da captura original, não pixels fixos de todos os dispositivos. A extensão 5200–5700 recompõe o símbolo do portfólio no contato; ela não é uma medição do original.

A máscara de hover usa a posição projetada no plano da tela e as dimensões da câmera. `u_progress2` continua separado de `u_progress`; a câmera fixa permite usar a mesma resolução física nos dois extremos sem deslocar a máscara do cursor.

Desvios conscientes das fórmulas do relatório:

- A máscara aplica a divisão de perspectiva e não usa o `mPos.y −= 1` do original. Esse deslocamento depende da cena da Dala, que não foi medida; sem ele, o cluster fica sob o cursor.
- A órbita do hover usa a frequência `0.7 + 2·random`. O intervalo de `a_random.y` não foi lido, e com valores em [0, 1) a órbita ficaria quase parada.
- O giro `mod(n + u_time, 2π)` mantém a faixa de fase de `n`, de cerca de 2 rad. Por isso, regiões grandes ficam de perfil ao mesmo tempo, no ciclo triângulo → linha → triângulo descrito no relatório.

A animação roda sempre com movimento completo: `prefers-reduced-motion` não é consultado e não há controle para desativá-la. Ela pausa com a página oculta, limita DPR a 1.5 e reconstrói os render targets após restauração de contexto. Sem WebGL2 ou render targets float, o conteúdo e as ações permanecem disponíveis.

## Geometria e aproximações

Os atlas originais, modelos, ranks, escalas e fatores radiais não foram fornecidos. O cérebro, a lâmpada, o globo e o símbolo são superfícies procedurais próprias. A câmera (FOV 40°, Z 14), o tamanho-base do quad, a distribuição dos parâmetros e o enquadramento mobile são reconstruídos. Esse conteúdo de textura é uma lacuna explicitamente indicada no anexo, não um valor medido. Por isso, três parâmetros foram calibrados contra as observações do relatório, contando os triângulos visíveis nas capturas em 1440×900 (`artifacts/review/`):

| Parâmetro | Antes | Agora | Observação do relatório | Medido depois |
| --- | --- | --- | --- | --- |
| Quad-base | 0.045 | 0.06 | Triângulos de 10–14 px no hero e ~12 px na Introdução | 8–12 px na Introdução |
| Fator radial `tParams3.x` | `1 + 18·√r` | `2.2 + 11·r^0.9` | Nuvem total com ~150 triângulos de 6–40 px e sem forma de cérebro | 151 triângulos, até 29 px (antes: 37, até 16 px) |
| Rank da explosão `tParams2.w` | aleatório uniforme | `0.6·altura + 0.4·aleatório` | Em explode 0.53, uma crista densa em arco permanece no topo e some em explode 1 | Crista no topo dos dois hemisférios em 0.534 |

O relatório sugeria ranks uniformes e atribuía a crista a fatores ≈ 1. Essa hipótese manteria a crista também na nuvem total, o que contradiz a observação de explode = 1. Já o rank ordenado pela altura reproduz as duas observações.

A skill img2threejs orientou decomposição, contrato de qualidade e inspeção de perfil/frente. Seu pipeline de extração a partir de imagem, projeção PBR e montagem de peças não se aplica ao campo decorativo descrito por equações. O contrato adaptado está em `reference/particle-sculpt-spec.json`; nenhum score de identidade pixel a pixel é alegado. Algorithmic-art contribuiu com geração determinística e cor espacial, documentadas em `algorithmic-philosophy.md`; o pedido explícito por Three.js prevalece sobre seu template p5.js.

## Matemática e validação

`scripts/verify-particle-math.py` usa SymPy 1.14 com números racionais exatos. A matriz da mola tem determinante 0.892 e raio espectral 0.9444575162, portanto a resposta é estável. O envelope de erro chega a 2% em aproximadamente 68.46 passos (1.14 s a 60 Hz), sem contar a entrada escalonada. O script também verifica os extremos do stagger e hover zero quando explode=1. Resultado salvo em `reference/math-verification.json`.

Os testes de interação congelam apenas o relógio do giro ambiente; a simulação continua com seu relógio independente. Comparações de retorno esperam a mola se acomodar e toleram apenas pequenas diferenças de rasterização. Há cobertura específica para hover desligado na nuvem, inércia após parar o scroll e aumento da região de hover com a velocidade do ponteiro. Esse último teste falha quando o ganho de velocidade é zerado.

Nenhum deploy, recurso, conta ou configuração Cloudflare foi alterado.
