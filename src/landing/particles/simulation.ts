import {
  FloatType,
  Mesh,
  NearestFilter,
  NoBlending,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  type IUniform,
  type Texture,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { SIDE } from "./forms/catalog";
import {
  copyFragment,
  fullscreenVertex,
  lookFragment,
  positionFragment,
  velocityFragment,
} from "./shaders/simulation";

type Uniforms = Record<string, IUniform>;

/**
 * GPGPU spring: velocity and position ping-pong between float targets, one
 * texel per particle (semi-implicit Euler), plus the look pass that resolves
 * each particle's colour for the current progress.
 */
export function createSimulation(
  renderer: WebGLRenderer,
  shared: Uniforms,
  textures: { initial: Texture; zero: Texture; color: Texture },
) {
  const makeTarget = () =>
    new WebGLRenderTarget(SIDE, SIDE, {
      type: FloatType,
      format: RGBAFormat,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });
  const positions = [makeTarget(), makeTarget()];
  const velocities = [makeTarget(), makeTarget()];
  const look = makeTarget();
  const geometry = new PlaneGeometry(2, 2);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const scene = new Scene();
  const material = (fragmentShader: string, uniforms: Uniforms) =>
    new ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
      blending: NoBlending,
    });
  const velocity = material(velocityFragment, {
    ...shared,
    t_current: { value: textures.initial },
    t_velocity: { value: textures.zero },
  });
  const position = material(positionFragment, {
    t_current: { value: textures.initial },
    t_velocity: { value: textures.zero },
  });
  const copy = material(copyFragment, { t_source: { value: textures.initial } });
  const lookMaterial = material(lookFragment, {
    ...shared,
    t_color: { value: textures.color },
  });
  const quad = new Mesh(geometry, copy);
  scene.add(quad);
  function pass(m: ShaderMaterial, destination: WebGLRenderTarget) {
    quad.material = m;
    renderer.setRenderTarget(destination);
    renderer.render(scene, camera);
  }
  let current = 0;
  return {
    get position() {
      return positions[current].texture;
    },
    look: look.texture,
    reset() {
      copy.uniforms.t_source.value = textures.initial;
      positions.forEach((target) => pass(copy, target));
      copy.uniforms.t_source.value = textures.zero;
      velocities.forEach((target) => pass(copy, target));
      current = 0;
    },
    step() {
      const next = 1 - current;
      velocity.uniforms.t_current.value = positions[current].texture;
      velocity.uniforms.t_velocity.value = velocities[current].texture;
      pass(velocity, velocities[next]);
      // Position reads the newly computed velocity: semi-implicit Euler.
      position.uniforms.t_current.value = positions[current].texture;
      position.uniforms.t_velocity.value = velocities[next].texture;
      pass(position, positions[next]);
      current = next;
    },
    resolveLook() {
      pass(lookMaterial, look);
    },
    dispose() {
      geometry.dispose();
      [velocity, position, copy, lookMaterial].forEach((m) => m.dispose());
      [...positions, ...velocities, look].forEach((t) => t.dispose());
    },
  };
}
