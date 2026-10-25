import { BufferGeometry, IcosahedronGeometry, Vector3 } from "three";
import { meshForm } from "./mesh-form";
import { BLUE, GOLD, TEAL, VIOLET, ramp } from "./palette";
import { assemble, node, strut } from "./sampling";

/** Engenharia: geodesic icosphere (frequency 2) built from struts and joints. */
export function truss(count: number, seed: number) {
  const sphere = new IcosahedronGeometry(1, 1);
  const p = sphere.getAttribute("position");
  const vertices: Vector3[] = [];
  const index = (v: Vector3) => {
    const found = vertices.findIndex((w) => w.distanceToSquared(v) < 1e-8);
    return found >= 0 ? found : vertices.push(v.clone()) - 1;
  };
  const edges = new Set<string>();
  for (let i = 0; i < p.count; i += 3) {
    const ids = [0, 1, 2].map((k) =>
      index(new Vector3().fromBufferAttribute(p, i + k)),
    );
    for (let k = 0; k < 3; k++) {
      const [a, b] = [ids[k], ids[(k + 1) % 3]].sort((m, n) => m - n);
      edges.add(`${a}-${b}`);
    }
  }
  const parts: BufferGeometry[] = [...edges].map((edge) => {
    const [a, b] = edge.split("-").map(Number);
    return strut(vertices[a], vertices[b], 0.022);
  });
  const JOINT = 0.065;
  vertices.forEach((v) => parts.push(node(v, JOINT)));
  const { geometry, fit, scale } = assemble(parts);
  const joints = vertices.map(fit);
  const reach = (JOINT * scale * 1.15) ** 2;
  return meshForm("truss", geometry, count, seed, 0.68, (point, _n, _uv, out) => {
    // Gold joints at the 42 vertices; struts blend teal → blue → violet by height.
    if (joints.some((j) => j.distanceToSquared(point) < reach)) out.copy(GOLD);
    else ramp([TEAL, BLUE, VIOLET], point.y * 0.5 + 0.5, out);
  });
}
