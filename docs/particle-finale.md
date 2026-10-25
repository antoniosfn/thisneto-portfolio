# Cena final — a cachoeira, a casa e o casal

Pedido de 24/10/2026: recriar [esta imagem](reference/finale/reference.webp) no campo de partículas, logo depois da Lia, encerrando o site com o desenho todo formado.

![Referência e prévia lado a lado](reference/finale/comparison.jpg)

## Como foi feita

A cena é construída a partir dos próprios pixels da imagem. É a técnica C do plano bg3d que acompanhou a imagem: partículas derivadas dos pixels. Um desenho com milhares de traços não se reconstrói forma a forma, como o livro ou a árvore.

1. **Amostragem por traço.** O peso de cada pixel é `brilho^1.3 × (0.35 + 2.2·borda^0.8)`, então traços e marcas claras pesam mais que o preenchimento. Uma reamostragem sistemática ao longo da imagem distribui as partículas sem aglomerar (`finale/build.ts`).
2. **Regiões.** Cada região da imagem (`finale/regions.ts`, coordenadas lidas numa grade de 50 px) define:
   - profundidade;
   - movimento;
   - peso no orçamento;
   - brilho próprio;
   - tamanho de partícula;
   - linhas de luz.

   O casal e os bichos recebem partículas finas e peso 5×. A folhagem recebe triângulos grandes. Os troncos foram traçados à mão como polilinhas, porque são traços escuros que o brilho não pega.
3. **Movimento** (`finale/shaders.ts`, `sceneAnimate`):
   - a água cai pelos fios e recicla;
   - o rio corre para baixo e para a esquerda;
   - a fumaça sobe da chaminé;
   - as nuvens derivam;
   - as folhas balançam;
   - a lua, as janelas e o casal respiram luz.
4. **Duas camadas.**
   - As 16 384 partículas do campo (o prefixo embaralhado) chegam da Lia e desenham a cena inteira em versão grossa.
   - Uma camada de detalhe de 32 768 triângulos leves (6 triângulos cada, contra 48 da pirâmide; `finale/triangle.ts`) completa o desenho nos últimos 60% da formação.
   - Tudo nasce a partir do casal: o rank de chegada é a distância até eles.
5. **Celular.** A imagem mantém a altura e a câmera atravessa o quadro devagar (40 s, ida e volta), em vez de encolher a cena.

A profundidade das regiões foi reduzida à metade, para a cena se ler como um quadro, com parallax leve.

## Rodar

```sh
npm run finale        # gera public/particles/finale.bin (ignorado no git)
npm run dev:vite      # prévia em http://localhost:5173/finale.html
node scripts/capture-finale.mts <pasta>   # capturas desktop e celular
```

Na prévia, `?formed=1` começa com a cena formada. O controle "Formação" percorre a chegada.

## Integração com a revisão 6 (branch da Lia)

Quando o trabalho da Lia tiver commit:

1. `SCENE_MOTION` (14 a 18) entra em `MOTION` (`forms/catalog.ts`) e `sceneAnimate` entra em `shaders/motion.ts`. O tamanho por região está em `motion.w`.
2. A cena vira a forma 9 (`FORM.finale`), com `buildScene(...).slice(0, CORE)` como builder. O atlas passa a ter 10 formas, e `GRID` já é calculado (4×4).
3. A camada de detalhe vira um `InstancedMesh` próprio, como o fundo, que aparece só no estágio final.
4. Um estágio 15 depois do contato (ou a seção da Lia estendida) leva o progresso até a cena. Desktop: fator 4,35, centralizada. Celular: fator 3,4 com a panorâmica.

## Limites

São 49 152 partículas e cerca de 40 mil linhas, contra dezenas de milhares de traços na imagem gerada. A cachoeira ainda é uma cortina mais larga e reta que a da referência, e a árvore da esquerda tem menos tronco visível. O arquivo de prévia em Float32 tem 2,6 MB; na integração ele passa ao formato quantizado do `forms.bin`.
