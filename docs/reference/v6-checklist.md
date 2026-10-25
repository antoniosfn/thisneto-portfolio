# Revisão 6 — verificação contra o pedido

Fonte de verdade: a mensagem original do Antonio (24/10/2026) e as respostas dele. As capturas de antes e depois ficam fora do git: gere-as com `node scripts/capture-stages.mts docs/reference/v6-before|v6-after`. Para as formas fixadas no progresso, use `node scripts/capture-forms.mts <pasta> 8.3,11.5,13.8`. As referências estão em `v6-targets/`. `v6-comparison.jpg` põe cada referência ao lado do render, e `v6-journey.jpg` mostra os 15 estágios.

| # | Pedido | Situação | Evidência |
| --- | --- | --- | --- |
| R1 | Hover na figura, com profundidade | Feito | Raio 3D e sonda de superfície. Teste `hover belongs to the figure` (`data-hover-hit` = 0 no vazio, 1 sobre o nó). Na captura do Chrome, a cratera abre no tubo e mostra o interior. |
| R2 | Capturas pelo Chrome com o mouse em várias posições | Feito | Extensão do Chrome no hero (centro, sobre a forma, fora dela). `capture-stages.mts` gera off, center, left e right × 15 estágios. |
| R3 | Grandes em enxame, nítidos em fragmento, também no mobile | Feito | Fator do mobile 3,0 (antes 2,2), DPR até 2. No mobile, o nó ocupa a largura toda. |
| R4 | Movimento involuntário de vácuo | Feito | `vacuum()` (0,21, 0,33 e 0,47 Hz), deriva por partícula e deriva do fundo. |
| R5 | Mais definição, sem depender só de quantidade | Feito | DPR adaptativo, saturação 1,32, emissão por partícula, tamanho por forma (`FORM_LOOK`), linhas de luz. A contagem subiu de 10 000 para 16 384. |
| R6 | Navegação fluida | Feito | Qualidade adaptativa relativa ao intervalo da tela, no máximo 3 passos de recuperação por quadro, troca de DPR sem salto de pose. |
| R7 | Fundo maior no mobile | Feito | Estilhaços de 0,075 para 0,095. |
| R8 | Preto AMOLED | Feito | Piso de 3/255. Pixels pretos puros: de 59% para 67% (hero) e de 63% para 74% (cubo). Teste `background is true black`. A faixa do cabeçalho, desfocada pelo CSS, é a única área com cinza residual. |
| R9 | Componentes organizados | Feito | `src/landing/particles/` (renderer, simulation, post, quality, hover, lines, timeline, `shaders/`, `forms/` com um arquivo por forma). |
| R10 | Nó ok; dispersão curta e fluxo organizado | Feito | Nuvem de 1,15 a 1,45; curl noise nas transições. |
| R11 | Lorenz, treliça e rede: antes, maiores, mais espaçadas e vivas | Feito | Formas completas antes do capítulo; escalas +15–20%; capítulos com 112vh. |
| R12 | Cubo mantido, maior, fragmentos melhores | Feito | Escala de 0,46 para 0,6; sem linhas de luz, para manter o desenho nítido. |
| R13 | Fila indiana até o centro, dividida em azul/roxo e amarelo/vermelho | Feito | `forms/stream.ts`, f = 7. |
| R14 | Livro (amarelo/vermelho) no alto à direita e átomo (azul/roxo) embaixo à esquerda, sincronizados com os projetos | Feito | f = 8–9; uma folha vira por projeto; órbitas e elétrons animados. |
| R15 | Explodem para baixo; semente que explode na Árvore da Vida, de dentro para fora | Feito | Chuva em f ≈ 9,7–10; semente; crescimento pelo rank de distância à semente, com espiral de galáxia. |
| R16 | Terminar com a mulher e apresentar a Lia | Feito | Seção `#lia` (copy provisória); figura em f = 13–14. |
| R17 | Recriar as imagens de fato | Feito, com limite | Livro, átomo e árvore seguem as referências de perto. A Lia é estilizada: legível como figura feminina flutuando, com a paleta e os chakras da referência, mas sem a riqueza anatômica de uma imagem gerada. |
| R18 | Imagem de referência → skills do Three.js | Feito | Imagens enviadas como referência; método da skill `img2threejs` (análise, traços de identidade, passes, comparação). |
| R19 | Copy livre; foco no fundo | Feito | Só entrou a seção da Lia; o resto da copy não mudou. |
