import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  LineSegments,
  ShaderMaterial,
  type IUniform,
} from "three";
import type { FormEdges } from "./data";
import { SIDE } from "./forms/catalog";
import { lineFragment, lineVertex } from "./shaders/lines";

/** Index range of each form's lines in the vertex buffer. */
type Range = { form: number; start: number; count: number };

/**
 * The lines of light of every form in one buffer, sorted by form; each frame
 * only the forms near the current progress are drawn.
 */
export function createLines(edges: FormEdges[], uniforms: Record<string, IUniform>) {
  const total = edges.reduce((n, e) => n + e.rest.length, 0) * 2;
  const a = new Float32Array(total * 2),
    b = new Float32Array(total * 2),
    end = new Float32Array(total),
    form = new Float32Array(total),
    rest = new Float32Array(total);
  const uvOf = (i: number) => [((i % SIDE) + 0.5) / SIDE, (Math.floor(i / SIDE) + 0.5) / SIDE];
  const ranges: Range[] = [];
  let v = 0;
  for (const set of edges) {
    const start = v;
    for (let e = 0; e < set.rest.length; e++) {
      const ua = uvOf(set.pairs[e * 2]),
        ub = uvOf(set.pairs[e * 2 + 1]);
      for (let side = 0; side < 2; side++, v++) {
        a.set(ua, v * 2);
        b.set(ub, v * 2);
        end[v] = side;
        form[v] = set.form;
        rest[v] = set.rest[e];
      }
    }
    ranges.push({ form: set.form, start, count: v - start });
  }
  const geometry = new BufferGeometry();
  // Positions come from the simulation; this attribute only sets the count.
  geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(total * 3), 3));
  geometry.setAttribute("aA", new Float32BufferAttribute(a, 2));
  geometry.setAttribute("aB", new Float32BufferAttribute(b, 2));
  geometry.setAttribute("aEnd", new Float32BufferAttribute(end, 1));
  geometry.setAttribute("aForm", new Float32BufferAttribute(form, 1));
  geometry.setAttribute("aRest", new Float32BufferAttribute(rest, 1));
  const material = new ShaderMaterial({
    vertexShader: lineVertex,
    fragmentShader: lineFragment,
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
  });
  const mesh = new LineSegments(geometry, material);
  mesh.frustumCulled = false;
  return {
    mesh,
    /** Draw the forms within one step of `progress`. */
    update(progress: number) {
      const near = ranges.filter((r) => Math.abs(r.form - progress) < 1);
      mesh.visible = near.length > 0;
      if (!near.length) return;
      const start = Math.min(...near.map((r) => r.start));
      const stop = Math.max(...near.map((r) => r.start + r.count));
      geometry.setDrawRange(start, stop - start);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
