# Antonio Neto · IA e software para empresas

Landing page B2B em React e TypeScript. Conta a trajetória de Antonio em três capítulos, apresenta projetos profissionais e conduz a uma conversa no LinkedIn. A narrativa usa somente o resumo público existente, sem inventar clientes, métricas, datas ou depoimentos.

## Executar localmente

Requer Node.js 22.12+ ou 24+ e npm.

```sh
npm ci
npm run dev
```

Next.js: http://127.0.0.1:3000.

```sh
npm run dev:vite
```

Vite: http://127.0.0.1:5173. Os dois caminhos renderizam o mesmo componente `src/landing/LandingPage.tsx`. Next.js usa seu próprio compilador; Vite é uma entrada alternativa, não um plugin do Next.js.

## Builds

```sh
npm run build
npm run preview:next
```

O Next.js exporta HTML estático em `out/`, incluindo conteúdo legível sem JavaScript. A prévia local usa o servidor do Vite para servir essa pasta; não requer backend Next.

```sh
npm run build:vite
npm run preview
```

O Vite gera a versão React em `dist/`, com renderização no cliente. Para publicação com conteúdo pré-renderizado, a entrega principal é `out/`.

## Estrutura

- `app/`: página, layout, metadados e página 404 do Next.js.
- `src/landing/content.ts`: fatos, capítulos, projetos, desafios, método e FAQ.
- `src/landing/LandingPage.tsx`: composição React e interações.
- `src/landing/SignalDiagram.tsx`: diagrama SVG original.
- `src/landing/landing.css`: identidade visual e layouts responsivos.
- `preview/`: entrada Vite para os mesmos componentes.
- `public/`: apenas a foto, fonte e favicon usados pela nova página.
- `docs/design-package.md`: direção criativa, funil e decisões de escopo.
- `tests/`: testes funcionais em navegador.

Arquivos estáticos antigos na raiz permanecem preservados, mas não participam dos novos builds. Não sirva a raiz com `serve .`: use os comandos acima para visualizar a nova versão. O snapshot anterior de `index.html` também está em `.local-tools/backups/`, ignorado pelo Git.

## Movimento e acessibilidade

GSAP com `@gsap/react` e ScrollTrigger. O canvas WebGL interpola seis formações pela posição real da rolagem, nos dois sentidos, incluindo saltos por âncoras. Mudanças na altura do conteúdo recalculam os pontos de transição. As animações têm escopo e limpeza no desmontar; a rolagem permanece nativa.

A preferência de movimento reduzido do sistema é respeitada ao vivo. O controle fixo no canto inferior permite **Ativar animação** ou **Reduzir animação**, salvando a escolha neste navegador. Assim, quem usa movimento reduzido no sistema pode ativar explicitamente o efeito de scroll. No modo reduzido, o campo fica estático e não mantém um loop de desenho.

Capítulos e links permanecem legíveis sem JavaScript na exportação Next. FAQ e detalhes usam elementos nativos. Controles dependentes de React ficam desativados até a hidratação.

## Contato e privacidade

O visitante escolhe um desafio, copia um roteiro e abre o LinkedIn. Não há envio automático, formulário com sucesso fictício, backend de leads, cookies de análise ou rastreadores. O conteúdo utiliza somente nome, foto, formação resumida, competências e links públicos já presentes no site.

Nenhum deploy foi realizado. Nenhum recurso Cloudflare foi criado ou alterado. A regra de custo zero permanece válida. Domínio canônico e imagem social absoluta devem ser definidos quando houver endereço de publicação confirmado.

## Validação

```sh
npm run typecheck
npm run build
npm run build:vite
# Em outro terminal, com npm run preview:next ativo:
npx playwright install chromium
npm run test:e2e
```

Se já houver Microsoft Edge instalado, no PowerShell:

```powershell
$env:PLAYWRIGHT_CHANNEL='msedge'
npm run test:e2e
```

Os testes cobrem seleção de desafios, roteiro de contato, FAQ por teclado, movimento reduzido, leitura sem JavaScript, recursos locais e larguras de 320 a 1440 px. Capturas ficam em `test-results/`. Para testar a prévia Vite, defina `TEST_BASE_URL` com seu endereço e `TEST_VITE=1`; o teste sem JavaScript se aplica somente ao Next.

Referências técnicas: [Next.js static export](https://nextjs.org/docs/app/guides/static-exports), [Vite build](https://vite.dev/guide/build), [GSAP matchMedia](<https://gsap.com/docs/v3/GSAP/gsap.matchMedia()>).
