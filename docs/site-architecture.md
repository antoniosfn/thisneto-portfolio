# Arquitetura do site

Descrição do código em `main` no commit `f2a9c8c45382a1e2fb79a03734be0d88a826940f`. Não descreve bytes publicados: o deploy de produção da Pages é ad hoc, com esse SHA e `commit_dirty=true`, e o nome de branch de produção `novodesign/ultraplan-v1` aponta no remoto para o ancestral `ab777565`. Onde este arquivo divergir de `README.md`, `docs/design-package.md` ou `docs/particle-experience.md`, vale o código citado.

## Entrada em execução

A publicação é o export estático do Next.js (`next.config.ts`: `output: "export"`). A página é `app/page.tsx`, que só renderiza `LandingPage`. O layout, as fontes e o CSS estão em `app/layout.tsx`: Barlow Condensed, Inter e IBM Plex Mono via `next/font/google`, variáveis `--font-display`, `--font-body` e `--font-mono`.

`npm run dev` / `npm run build` usam esse caminho. A saída fica em `out/`. `public/` é copiado para lá, inclusive `public/particles/forms.bin`, `public/_headers` e `public/_routes.json`.

O Vite não é o runtime publicado. `vite.config.ts` usa a raiz `preview/`; `preview/index.html` carrega `preview/main.tsx`, que monta o mesmo `LandingPage`. `npm run dev:vite` e `npm run build:vite` (`dist/`) são a via alternativa. `index.html` na raiz do repositório não entra em nenhum dos dois builds. `preview/finale.ts` e `src/landing/SignalDiagram.tsx` não são importados pela página.

`functions/api/contato.ts` é Pages Function, só `onRequestPost`, fora do bundle Next. `_routes.json` limita Functions a `/api/*`.

## Stack

Next.js 16.3, React 19.3, TypeScript. Campo visual: Three.js 0.186, WebGL2, simulação GPGPU, pós-processamento. Texto e cabeçalho: GSAP, `@gsap/react`, ScrollTrigger, SplitText. Rolagem suave em ponteiro fino: Lenis. Formulário: a Function acima e Resend (`RESEND_API_KEY` no projeto Pages). Testes de navegador: Playwright em `tests/`.

## Mapa

| Caminho | Papel |
| --- | --- |
| `src/landing/content.ts` | Fatos, seções e links |
| `src/landing/LandingPage.tsx` | Composição, scroll e progresso `f` |
| `src/landing/text-reveal.ts` | Entrada do texto |
| `src/landing/ParticleField.tsx` | Canvas e ciclo de vida do renderer |
| `src/landing/particles/timeline.ts` | `f` → pose |
| `src/landing/particles/renderer.ts` | Cena, loop e uniforms |
| `src/landing/particles/geometry.ts` | Malha do tetraedro de fio |
| `src/landing/particles/backdrop.ts` | 250 shards de fundo |
| `src/landing/particles/forms/` | Geradores das formas; só no build do atlas |
| `src/landing/particles/forms-file.ts` | Leitura de `forms.bin` no browser |
| `src/landing/landing.css` | Layout; o canvas é `position: fixed` |
| `src/landing/Loader.tsx` | Véu até os dois primeiros quadros |

## Tetraedros

Não há `TetrahedronGeometry` no fundo. `createPyramidGeometry` monta um tetraedro regular à mão: quatro vértices em `CORNERS`, seis arestas em `EDGES`, cada aresta um prisma triangular. O fundo (`createBackdrop`) instancia essa malha 250 vezes (`EXTENT` 1.5). Cada uma das partículas do campo usa a mesma função com `PARTICLE_SIZE` 0.06. Os dois são `InstancedMesh` com `ShaderMaterial`. O fragmento do fundo é o mesmo das partículas; o vértice do fundo só gira o shard e o desloca com o ponteiro (`u_mouse`). Não lê scroll.

`THREE.TetrahedronGeometry` aparece só em `edgeFrame` (`primitives.ts`). A forma Saturno chama `edgeFrame("tetra", …)` 28 vezes para pedrinhas dos anéis. Isso gera pontos do atlas, amostrados para `forms.bin`. No ar, esses pontos também são desenhados com a pirâmide de `createPyramidGeometry`, não com o sólido do Three. `edgeFrame("star")` usa dois tetraedros e entra na forma da figura (`woman.ts`), não no fundo. A ponta remota `novodesign/ultraplan-v1` tem a pirâmide manual e não tem `TetrahedronGeometry`.

O atlas não é calculado no browser. `npm run particles` executa `scripts/build-particle-forms.mts` → `createForms` → `encodeForms`. Ordem em `FORM`: Lorenz 0, cubo 1, livro+átomo 2, Saturno 3, finale 4. O runtime busca `/particles/forms.bin`. `pose()` só eleva `u_progress` até Saturno (3); `scene` fica 0, então a forma finale do arquivo não é a pose da rolagem.

## Progresso e texto

Não há timeline GSAP compartilhada entre texto e campo. O acoplamento é o scroll.

`LandingPage` mede `[data-particle-stage]` (0 na hero … 11 no formulário). `sectionProgress` interpola a posição suave entre essas âncoras e grava `particleController.progress`. O renderer lê esse número todo quadro, calcula `pose()` e amortece com `easePose` (`POSE_EASE` 0.1, rotação 0.075, normalizados a 60 Hz). A pose vira `u_progress`, explosão, página, solve, fator, offset e rotação. O shader troca a forma `k` quando `u_progress` se aproxima de `k`.

Os shards de fundo não entram nessa pose. `backdrop.update` só recebe o ponteiro. São independentes do texto e da seção.

O texto não observa o canvas. `revealText` percorre folhas `.reveal` (`h1–h3`, `p`, `dt`, `figcaption`, `.eyebrow`), ignora `details` e caixas flex/grid, e parte em linhas com SplitText (`mask: "lines"`, `aria: "none"`). Fora da hero, cada linha sobe com `yPercent: 120` enquanto o bloco vai de `top 98%` a `top 60%`, `scrub: 0.6`, `ease: "none"`. Na hero o tween não tem `scrub`: heading 1 s, corpo 1 s com delay 1 s, botão 1 s `expo.out` com delay 1,5 s, `start: "top bottom"`. O stagger configurado é `each: 0.1` com `power1.in`; na trilha com scrub a ease da linha é `none`. Não há `pin`, `toggleActions`, `markers` nem `IntersectionObserver`. Um `ResizeObserver` no root só chama `ScrollTrigger.refresh`. A limpeza é `split.revert()` no retorno do `useGSAP`.

Não existe `prefers-reduced-motion` no `src/` nem no CSS. Lenis está com `respectReducedMotion: false` e só é ligado quando o ponteiro não é grosso; aí `lerp = -ln(1 - 0.075)`, `syncTouch: false`, o `raf` vai no ticker do GSAP e `scroll` chama `ScrollTrigger.update`. Sem esse ponteiro, a rolagem é a nativa e o ScrollTrigger continua no scroll da janela. `scroll-behavior: smooth` está no `html`. Impressão esconde o canvas e força o texto visível. Sem JavaScript, o `<noscript>` do layout só esconde o loader; o HTML exportado permanece.

## Convenções

Conteúdo novo entra em `content.ts`, não em cópia solta no JSX. Forma nova: um módulo em `forms/`, entrada em `FORM` e `FORM_BUILDERS`, depois `npm run particles`; o binário versionado é o que o site carrega. O campo não espera o conteúdo, e o conteúdo não espera o WebGL: se o contexto ou o atlas falham, o loader termina e `canvas.dataset.renderer` fica `unavailable`. Densidade: 16 384 partículas; abaixo de 760 px o campo desenha 11 000. O loop descansa abaixo de 0,75 quadro de 60 Hz e no máximo 3 passos de simulação por quadro.
