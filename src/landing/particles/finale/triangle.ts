import { BufferGeometry, Float32BufferAttribute } from "three";

/**
 * Light particle for the detail layer: the outline of a triangle as three thin
 * quads (6 triangles, against the pyramid's 48), so tens of thousands stay
 * cheap. `size` is the triangle's extent; `bar` the stroke width as a share.
 */
export function createTriangleGeometry(size: number, bar = 0.09) {
  const corners = [0, 1, 2].map((k) => {
    const a = Math.PI / 2 + (k * 2 * Math.PI) / 3;
    return [Math.cos(a) * size * 0.58, Math.sin(a) * size * 0.58];
  });
  const positions: number[] = [];
  const width = size * bar;
  for (let k = 0; k < 3; k++) {
    const [ax, ay] = corners[k],
      [bx, by] = corners[(k + 1) % 3];
    const length = Math.hypot(bx - ax, by - ay);
    // Inward normal of the edge: the stroke grows towards the centre.
    const nx = (-(by - ay) / length) * width,
      ny = ((bx - ax) / length) * width;
    const quad = [
      [ax, ay],
      [bx, by],
      [bx + nx, by + ny],
      [ax, ay],
      [bx + nx, by + ny],
      [ax + nx, ay + ny],
    ];
    for (const [x, y] of quad) positions.push(x, y, 0);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return geometry;
}
