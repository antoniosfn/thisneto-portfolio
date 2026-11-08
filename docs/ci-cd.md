# CI e deploy do Pages

O site publicado continua no projeto Pages `thisneto` (`0812d498-5597-46c9-a277-6535de98c283`), conta `320fd8cf3b869be36418db3d19f069e3`. O upload direto não pode ser convertido em integração Git. O workflow não cria outro projeto e não copia `RESEND_API_KEY`: esse segredo fica no ambiente de produção da Pages.

Enquanto `production_branch` for `novodesign/ultraplan-v1`, um deploy com `--branch=main` é preview. Não substitui `tonin.tech`, `www.tonin.tech`, `thisneto.dev` nem `thisneto.pages.dev`. Quando o branch de produção passar a ser `main`, o mesmo comando publica em produção, sem aprovação manual no GitHub, e só se o relatório de paridade do artefato testado estiver `ok`.

## Comandos

```sh
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run test:e2e
npm run provenance
npm run parity
```

`lint` confere o contrato de Functions/`_routes.json` e o formato dos scripts novos. Não reformata o site: o código já versionado não passa no Prettier e um reformat não entra neste fluxo. `test:e2e` sobe `out/` com `npm run preview:next` e roda o Playwright em desktop e mobile. No runner do GitHub, o CI deixa de fora as checagens de pixel que não assentam no WebGL headless, o overflow de glifos em 1100 px, o livro de loading e a cópia das soluções quando o loader ou `data-entered` não fecham no tempo do runner. O comando local sem filtro continua sendo a suíte inteira. `provenance` copia `out/` e `functions/` para `deploy-bundle/` com SHA-256. O deploy usa esse diretório; não roda `next build` de novo.

## Segredo

Actions secret `CLOUDFLARE_API_TOKEN`: conta, permissão Cloudflare Pages Edit, só nesta conta, sem DNS. O account id vai no workflow, não é segredo. Sem o token o job Deploy termina com erro. Não há skip silencioso.

## Rollback

No Actions, dispare o workflow Deploy em `main` com `rollback_deployment_id` igual ao deployment anterior. Isso chama o rollback da Pages e não reconstrói o site. O id canônico anterior é impresso no log quando um deploy vai substituir produção.

## Limite da paridade

`npm run parity` compara o texto visível de `out/index.html` e os arquivos estáveis de `public/` com `https://tonin.tech`. Não recupera o working tree do upload `commit_dirty=true` e não iguala os hashes de `/_next/static`.
