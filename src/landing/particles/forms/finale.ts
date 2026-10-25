import { readFileSync } from "node:fs";
import { CORE, DETAIL, buildScene, type SceneForm } from "../finale/build";
import { decodePng } from "../finale/png";
import type { FormData } from "./compose";

/**
 * The closing scene as form 9: the first CORE particles of the picture (a
 * shuffled prefix, so they cover all of it) are the field's; the rest form the
 * detail layer, written apart (see scripts/build-particle-forms.mts).
 */
const SOURCE = new URL("../../../../docs/reference/finale/source-640.png", import.meta.url);

let built: SceneForm | undefined;
export function finaleScene() {
  built ??= buildScene(decodePng(readFileSync(SOURCE)), CORE + DETAIL);
  return built;
}

export function finale(count: number): FormData {
  const scene = finaleScene();
  if (count !== CORE) throw new Error(`finale expects ${CORE} field particles, got ${count}`);
  const edges: number[] = [];
  for (let e = 0; e < scene.edges.length; e += 2)
    if (scene.edges[e] < count && scene.edges[e + 1] < count) edges.push(scene.edges[e], scene.edges[e + 1]);
  return {
    name: "finale",
    points: scene.points.slice(0, count * 3),
    colors: scene.colors.slice(0, count * 3),
    emission: scene.emission.slice(0, count),
    ranks: scene.ranks.slice(0, count),
    motion: scene.motion.slice(0, count * 4),
    edges,
  };
}
