# Experiência de partículas — revisão de 24/10/2026

A fonte de verdade desta revisão é [o relatório fornecido](reference/dala-measurements.json), preservado integralmente. A referência visual do Refero é Dala, estilo `ba81bf2a-a5ad-4234-92a4-1d6d47742785`, consultado no conector. A página pública permaneceu no carregamento durante a captura; isso impede uma comparação visual direta do modelo original.

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

A animação respeita a preferência de movimento, pausa com a página oculta, limita DPR a 1.5 e reconstrói os render targets após restauração de contexto. Sem WebGL2 ou render targets float, o conteúdo e as ações permanecem disponíveis.

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
