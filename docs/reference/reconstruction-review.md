# Revisão da reconstrução procedural

Fonte principal: docs/reference/dala-measurements.json. A captura de dala.craftedbygc.com terminou no loading, portanto não constitui evidência da forma final do original.

Contrato: docs/reference/particle-sculpt-spec.json. Implementação direta do pipeline GPGPU solicitado, em vez de geração de uma fábrica de malhas a partir de fotografia. Não foram extraídos modelos ou pixels da Dala.

Inspeção local em 1440×900: perfil com córtex, cerebelo e haste; vista frontal com hemisférios e fissura; nuvem esparsa na explosão completa; lâmpada inclinada e globo com continentes. As vistas de perfil e frontal demonstram volume, não apenas um contorno plano. O enquadramento frontal transborda a esquerda conforme o relatório. Mobile 390×844: forma abaixo do título, sem sobreposição do texto principal.

Evidências locais: artifacts/hero-first.png, artifacts/frontal.png, artifacts/explosion.png, artifacts/bulb.png, artifacts/globe.png, artifacts/mobile.png. As primeiras capturas de lâmpada/globo precedem o alinhamento final dos marcos do texto; a geometria não mudou nessa correção.

Segunda inspeção, em 24/10/2026, de todos os marcos: hero, Introdução, explode 0.534, nuvem total, lâmpada, globo, contato e mobile. As capturas estão em artifacts/review/ e as anteriores à calibração em artifacts/review/before/. Os valores do dataset do canvas coincidem com a tabela do relatório: explode 0.534 em 1250, progress 1 em 2750 e progress 2 em 3500. Calibrações e motivos estão em docs/particle-experience.md, na seção "Geometria e aproximações".

Estado do img2threejs (.img2threejs/state.json): os passos de setup e de passe foram registrados, como concluídos com evidência ou ignorados com motivo. O estado para em `await-pass-transition`. Concluir essa etapa exigiria gravar no contrato uma revisão de passe de escultura com aprovação, e esse pipeline de malha não se aplica aqui. A transição fica deliberadamente pendente, em vez de declarar uma aprovação inexistente.

Limites: anatomia estilizada, dados de textura reconstruídos, câmera inferida, sem referência raster original admitida para scoring. Os gates fotográficos, materiais PBR, rigs, sockets, part-picking e emissão GLB não correspondem ao artefato solicitado. Nenhuma aprovação desses gates é alegada. A avaliação compara a implementação com as observações e equações do relatório.

Revisão técnica: posição consome a velocidade nova; atlas usa filtragem nearest e não recebe correção sRGB; a conversão de cor ocorre após o passe de vinheta; os recursos Three.js, texturas e render targets são liberados no unmount; contexto restaurado reinicializa os buffers; hover usa ganho zero no estado explodido. As formas/câmera, parâmetros desconhecidos e extensão do footer estão identificados como aproximações no contrato e na documentação.
