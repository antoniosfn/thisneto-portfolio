# CI e deploy do Pages

O site publicado continua no projeto Pages `thisneto` (`0812d498-5597-46c9-a277-6535de98c283`), conta `320fd8cf3b869be36418db3d19f069e3`. O upload direto não vira integração Git. O workflow não cria outro projeto e não copia `RESEND_API_KEY`: esse segredo fica no ambiente de produção da Pages. `compatibility_date` `2026-09-21` é conferido depois do upload e o deploy falha se ele ou o nome `RESEND_API_KEY` sumirem.

## O que o CI cobre

`npm run test:e2e` sobe `out/` e roda desktop e mobile. O job obrigatório exclui só os testes marcados `@visual`. Esses comparam pixels de WebGL. No GPU de software dois quadros da mesma pose não são estáveis o bastante para um limiar de 0,00001, e o relógio contínuo (elétrons, spin) muda a imagem de propósito. O contrato determinístico correspondente está em `tests/field-sync.spec.ts`: o flag de abertura segue o tempo de parede, o atlas separa núcleo fixo de elétron com `u_clock`, o progresso preso `?f=` casa com `pose()`, e o hover liga só com a figura inteira. O fundo preto é o `setClearColor(0x000000, 1)` lido do renderer. O job `visual` roda os testes `@visual` e não bloqueia o merge; a falha fica visível. O limiar de velocidade do ponteiro também está lá: ele assume um evento a cada 16 ms, e no runner os eventos se juntam.

O loader e o `data-entered` não eram um timeout curto. O fade de abertura usava o teto de 0,1 s da simulação, então um quadro lento quase não contava. O GSAP do loader, com lag smoothing, tratava o mesmo quadro como um soluço de 33 ms e a saída não terminava. Os dois relógios agora usam o tempo real.

## Comandos

```sh
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run test:e2e
npm run test:e2e -- --grep @visual
npm run provenance
npm run parity
```

## Deploy

O job Deploy só aceita três modos, e falha se o token não existe:

- `push`: o CI acabou de passar num push para `main` deste repositório. O artefato é o daquela run, e o SHA tem de ser a ponta de `origin/main`. Uma run antiga não publica.
- `promote`: `workflow_dispatch` com `promote_run_id` de um CI `push`/`main`/`success` deste repo. Baixa o artefato dessa run, não o de outro SHA. É o deploy que falta depois de mudar `production_branch`: o PATCH da API não reclassifica um preview já enviado.
- `rollback`: `workflow_dispatch` com `rollback_deployment_id`. Não reconstrói o site. O id canônico anterior é impresso em todo deploy.

Enquanto `production_branch` for `novodesign/ultraplan-v1`, `--branch=main` é preview e não troca `tonin.tech`. Com `production_branch` igual a `main`, o mesmo comando só publica se a paridade do artefato estiver `ok`. O smoke faz POST vazio em `/api/contato` e só aceita 422 ou 503. Um 200 seria envio e falha o job.

## Segredo

O token desta automação não lê nem grava segredos (`403 Resource not accessible by integration`). O dono do repositório cria `CLOUDFLARE_API_TOKEN` na UI do GitHub: Account, Cloudflare Pages, Edit, só a conta `320fd8cf3b869be36418db3d19f069e3`, sem DNS. Sem esse valor o Deploy falha. Não copiar `RESEND_API_KEY`.

## Paridade

`npm run parity` compara o texto visível de `out/index.html` e os arquivos estáveis de `public/` com `https://tonin.tech`. Não recupera o working tree do upload `commit_dirty=true` e não iguala `/_next/static`.
