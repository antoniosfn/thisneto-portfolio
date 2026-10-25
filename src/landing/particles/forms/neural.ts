import { BufferGeometry, Vector3 } from "three";
import { meshForm } from "./mesh-form";
import { BLUE, GOLD, TEAL, VIOLET, ramp } from "./palette";
import { assemble, node, strut } from "./sampling";

const LAYERS = [4, 7, 7, 3] as const;
const LAYER_TONES = [TEAL, BLUE, VIOLET, GOLD];

function layerNodes() {
  return LAYERS.map((size, layer) =>
    Array.from({ length: size }, (_, k) => {
      const angle = (k / size) * Math.PI * 2 + layer * 0.4;
      const ring = 0.35 + size * 0.1;
      return new Vector3(
        (layer - 1.5) * 1.15,
        Math.cos(angle) * ring,
        Math.sin(angle) * ring,
      );
    }),
  );
}

/** IA: a four-layer network (4–7–7–3), nodes as spheres, weights as fibres. */
export function neural(count: number, seed: number) {
  const layers = layerNodes();
  const parts: BufferGeometry[] = [];
  for (let l = 0; l < layers.length - 1; l++)
    for (const a of layers[l])
      for (const b of layers[l + 1]) parts.push(strut(a, b, 0.008));
  layers.flat().forEach((v) => parts.push(node(v, 0.13)));
  const { geometry, fit } = assemble(parts);
  const first = fit(layers[0][0]).x,
    last = fit(layers[layers.length - 1][0]).x;
  return meshForm("neural", geometry, count, seed, 0.84, (point, _n, _uv, out) => {
    // Node colours by layer; fibres fade between the layers they connect.
    ramp(LAYER_TONES, (point.x - first) / (last - first), out);
  });
}
