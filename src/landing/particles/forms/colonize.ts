import { Vector3 } from "three";
import { random } from "./hash";

/** A node of a grown branch network. */
export type Branch = {
  at: Vector3;
  parent: number; // −1 for the root
  children: number[];
  length: number; // path length from the seed
  radius: number;
};

type Options = {
  start: Vector3[]; // initial chain, root first
  attractors: Vector3[];
  step: number;
  influence: number;
  kill: number;
  bias: Vector3; // tropism added to every growth direction
  iterations: number;
};

/**
 * Space colonisation (Runions et al., 2007): every attractor pulls its nearest
 * node; nodes grow one step towards the mean pull, and attractors that are
 * reached disappear. Yields the natural branching of a crown or a root plate.
 */
export function colonize(options: Options) {
  const nodes: Branch[] = [];
  options.start.forEach((at, i) => {
    nodes.push({
      at: at.clone(),
      parent: i - 1,
      children: [],
      length: i ? nodes[i - 1].length + at.distanceTo(nodes[i - 1].at) : 0,
      radius: 0,
    });
    if (i) nodes[i - 1].children.push(i);
  });
  let attractors = options.attractors.slice();
  const cell = options.influence;
  const key = (v: Vector3) =>
    `${Math.floor(v.x / cell)},${Math.floor(v.y / cell)},${Math.floor(v.z / cell)}`;
  const grid = new Map<string, number[]>();
  const insert = (i: number) => {
    const k = key(nodes[i].at);
    const bucket = grid.get(k);
    if (bucket) bucket.push(i);
    else grid.set(k, [i]);
  };
  nodes.forEach((_, i) => insert(i));
  const nearest = (v: Vector3) => {
    let best = -1,
      bestD = options.influence ** 2;
    const gx = Math.floor(v.x / cell),
      gy = Math.floor(v.y / cell),
      gz = Math.floor(v.z / cell);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++)
          for (const i of grid.get(`${gx + dx},${gy + dy},${gz + dz}`) ?? []) {
            const d = nodes[i].at.distanceToSquared(v);
            if (d < bestD) {
              bestD = d;
              best = i;
            }
          }
    return { index: best, distance: Math.sqrt(bestD) };
  };
  for (let it = 0; it < options.iterations && attractors.length; it++) {
    const pull = new Map<number, Vector3>();
    attractors = attractors.filter((a) => {
      const { index, distance } = nearest(a);
      if (index < 0) return true;
      if (distance < options.kill) return false;
      const dir = a.clone().sub(nodes[index].at).normalize();
      const sum = pull.get(index);
      if (sum) sum.add(dir);
      else pull.set(index, dir);
      return true;
    });
    if (!pull.size) break;
    for (const [index, dir] of pull) {
      dir.normalize().add(options.bias).normalize();
      const parent = nodes[index];
      const at = parent.at.clone().addScaledVector(dir, options.step);
      // Small wobble so branches are not ruler-straight.
      at.x += (random(nodes.length, 7) - 0.5) * options.step * 0.3;
      at.z += (random(nodes.length, 8) - 0.5) * options.step * 0.3;
      nodes.push({
        at,
        parent: index,
        children: [],
        length: parent.length + options.step,
        radius: 0,
      });
      parent.children.push(nodes.length - 1);
      insert(nodes.length - 1);
    }
  }
  return nodes;
}

/**
 * Pipe model: a branch carries the cross-section of all it supports.
 * Exponent 2 preserves area (da Vinci), 3 is Murray's law; real trees measure
 * 2.0–2.5. Below 2 the trunk fattens relative to the twigs.
 */
export function thicken(nodes: Branch[], tip: number, exponent: number) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    node.radius = node.children.length
      ? Math.pow(
          node.children.reduce((s, c) => s + nodes[c].radius ** exponent, 0),
          1 / exponent,
        )
      : tip;
  }
}
