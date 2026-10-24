import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";

/**
 * Dala draws each particle as a wireframe pyramid built from solid geometry:
 * its py-lod1.glb holds 36 vertices and 48 triangles, i.e. one triangular
 * prism (6 vertices, 8 triangles) per edge of a tetrahedron, about 1.07 units
 * across and shaded with a flat colour. This builds the same construction from
 * scratch; the bar thickness is read from close-up screenshots.
 */
const BAR = 0.06; // prism circumradius as a fraction of the edge length

const CORNERS = [
  new Vector3(1, 1, 1),
  new Vector3(1, -1, -1),
  new Vector3(-1, 1, -1),
  new Vector3(-1, -1, 1),
];
const EDGES = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
] as const;

function prism(a: Vector3, b: Vector3, radius: number, out: number[]) {
  const axis = b.clone().sub(a).normalize();
  // For a regular tetrahedron the edge midpoint direction is normal to the edge.
  const outward = a.clone().add(b).normalize();
  const side = new Vector3().crossVectors(axis, outward);
  // Overlap the joints so corners close without gaps.
  const start = a.clone().addScaledVector(axis, -radius);
  const end = b.clone().addScaledVector(axis, radius);
  const ring = [0, 1, 2].map((k) => {
    const angle = (k * 2 * Math.PI) / 3;
    return outward
      .clone()
      .multiplyScalar(Math.cos(angle) * radius)
      .addScaledVector(side, Math.sin(angle) * radius);
  });
  const near = ring.map((offset) => start.clone().add(offset));
  const far = ring.map((offset) => end.clone().add(offset));
  const push = (...points: Vector3[]) =>
    points.forEach((point) => out.push(point.x, point.y, point.z));
  push(near[0], near[2], near[1], far[0], far[1], far[2]);
  for (let k = 0; k < 3; k++) {
    const j = (k + 1) % 3;
    push(near[k], near[j], far[j], near[k], far[j], far[k]);
  }
}

/** Wireframe pyramid scaled so its largest extent is `size`. */
export function createPyramidGeometry(size: number) {
  const edge = CORNERS[0].distanceTo(CORNERS[1]);
  const positions: number[] = [];
  for (const [a, b] of EDGES)
    prism(CORNERS[a], CORNERS[b], edge * BAR, positions);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const span = Math.max(
    box.max.x - box.min.x,
    box.max.y - box.min.y,
    box.max.z - box.min.z,
  );
  geometry.scale(size / span, size / span, size / span);
  return geometry;
}
