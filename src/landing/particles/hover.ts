import {
  BufferGeometry,
  Color,
  DataUtils,
  CustomBlending,
  Float32BufferAttribute,
  HalfFloatType,
  MinEquation,
  NearestFilter,
  OneFactor,
  type PerspectiveCamera,
  Points,
  Raycaster,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  type IUniform,
  Vector2,
  Vector3,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { HOVER, probeFragment, probeVertex } from "./shaders/hover";

/**
 * Finds the figure's front surface under the pointer on the GPU: every
 * particle close to the pointer ray writes its depth into one pixel with MIN
 * blending. No read-back; the particle shaders sample that pixel.
 */
export function createHoverProbe(
  renderer: WebGLRenderer,
  uv: Float32Array,
  uniforms: Record<string, IUniform>,
) {
  const target = new WebGLRenderTarget(1, 1, {
    type: HalfFloatType,
    format: RGBAFormat,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthBuffer: false,
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array((uv.length / 2) * 3), 3));
  geometry.setAttribute("aSimulationUv", new Float32BufferAttribute(uv, 2));
  const material = new ShaderMaterial({
    vertexShader: probeVertex,
    fragmentShader: probeFragment,
    uniforms,
    depthTest: false,
    depthWrite: false,
    blending: CustomBlending,
    blendEquation: MinEquation,
    blendSrc: OneFactor,
    blendDst: OneFactor,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  const scene = new Scene();
  scene.add(points);
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const far = new Color(HOVER.far, 0, 0);
  const previous = new Color();
  const pixel = new Uint16Array(4);
  let frame = 0,
    reading = false,
    hit = false;
  return {
    texture: target.texture,
    /** Whether the pointer ray met the figure, read back a few frames late. */
    get hit() {
      return hit;
    },
    /** Probe only the particles that are drawn (small screens draw a prefix). */
    setDrawn(count: number) {
      geometry.setDrawRange(0, count);
    },
    /** Aim the ray through the pointer (NDC) and probe the surface depth. */
    update(camera: PerspectiveCamera, pointer: Vector2, active: boolean, origin: Vector3, dir: Vector3) {
      camera.updateMatrixWorld();
      raycaster.setFromCamera(ndc.copy(pointer), camera);
      origin.copy(raycaster.ray.origin);
      dir.copy(raycaster.ray.direction);
      renderer.getClearColor(previous);
      const alpha = renderer.getClearAlpha();
      renderer.setRenderTarget(target);
      renderer.setClearColor(far, 1);
      renderer.clear(true, false, false);
      if (active) renderer.render(scene, camera);
      renderer.setClearColor(previous, alpha);
      if (!active) hit = false;
      // Asynchronous read-back (no pipeline stall), a few times per second.
      else if (!reading && ++frame % 12 === 0) {
        reading = true;
        renderer
          .readRenderTargetPixelsAsync(target, 0, 0, 1, 1, pixel)
          .then(() => (hit = DataUtils.fromHalfFloat(pixel[0]) < HOVER.far / 2))
          .catch(() => (hit = false))
          .finally(() => (reading = false));
      }
    },
    dispose() {
      target.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
