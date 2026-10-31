import {
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  ShaderMaterial,
  Vector2,
} from "three";
import { createPyramidGeometry } from "./geometry";
import { random } from "./forms/hash";
import { ease } from "./motion";
import { backdropVertex } from "./shaders/backdrop";
import { particleFragment } from "./shaders/particle";

/**
 * Dala's background layer: 250 triangles spread over the viewport (x, y in
 * [−1, 1] of the visible extent) and over depth z ∈ [0, 9], so those close to
 * the camera become the large foreground shards. Palette and random alpha are
 * Dala's; the pyramid size follows the reference screenshots.
 */
const COUNT = 250;
const PALETTE = [
  [93, 57, 154],
  [186, 136, 43],
  [40, 116, 100],
  [164, 148, 175],
] as const;
const SCALE = { desktop: 0.05, mobile: 0.055 } as const;
// Pyramid extent before the per-layer scale; keeps the screenshot-matched size.
const EXTENT = 1.5;
const MOUSE = { gain: 0.25, ease: 0.1 } as const;

export function createBackdrop() {
  const geometry = createPyramidGeometry(EXTENT);
  const origin = new Float32Array(COUNT * 4),
    color = new Float32Array(COUNT * 4),
    angle = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) {
    const tone = PALETTE[i % 4];
    origin.set(
      [random(i, 40) * 2 - 1, random(i, 41) * 2 - 1, random(i, 42) * 9, 0],
      i * 4,
    );
    color.set(
      [tone[0] / 255, tone[1] / 255, tone[2] / 255, random(i, 43)],
      i * 4,
    );
    angle.set(
      [
        random(i, 44) * 2 - 1,
        random(i, 45) * 2 - 1,
        random(i, 46) * 2 - 1,
        random(i, 47) * 2 * Math.PI,
      ],
      i * 4,
    );
  }
  geometry.setAttribute("aOrigin", new InstancedBufferAttribute(origin, 4));
  geometry.setAttribute("aTone", new InstancedBufferAttribute(color, 4));
  geometry.setAttribute("aAngle", new InstancedBufferAttribute(angle, 4));
  const material = new ShaderMaterial({
    vertexShader: backdropVertex,
    fragmentShader: particleFragment,
    uniforms: {
      u_extent: { value: new Vector2(1, 1) },
      u_mouse: { value: new Vector2() },
      u_scale: { value: SCALE.desktop },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: DoubleSide,
  });
  const mesh = new InstancedMesh(geometry, material, COUNT);
  const identity = new Matrix4();
  for (let i = 0; i < COUNT; i++) mesh.setMatrixAt(i, identity);
  mesh.frustumCulled = false;
  const shift = new Vector2();
  return {
    mesh,
    resize(extent: Vector2, mobile: boolean) {
      material.uniforms.u_extent.value.copy(extent);
      material.uniforms.u_scale.value = mobile ? SCALE.mobile : SCALE.desktop;
    },
    update(pointer: Vector2, active: boolean, frames: number) {
      // Returns to rest when the pointer leaves, like the camera parallax.
      if (active) shift.copy(pointer).multiplyScalar(MOUSE.gain);
      else shift.set(0, 0);
      material.uniforms.u_mouse.value.lerp(shift, ease(MOUSE.ease, frames));
    },
    dispose() {
      mesh.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
