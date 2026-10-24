import {
  DoubleSide,
  FloatType,
  HalfFloatType,
  InstancedBufferAttribute,
  InstancedMesh,
  LinearSRGBColorSpace,
  type IUniform,
  Matrix4,
  Mesh,
  NearestFilter,
  NoBlending,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { ParticleController } from "./ParticleField";
import { createBackdrop } from "./particle-backdrop";
import {
  createParticleCamera,
  frameCamera,
  parallaxCamera,
  OBJECT_Y,
} from "./particle-camera";
import { COUNT, SIDE, createParticleData } from "./particle-data";
import { createPyramidGeometry } from "./particle-geometry";
import type { SampledForm } from "./particle-shapes";
import { PointerMotion, STEP, createPose, easePose } from "./particle-motion";
import { desktopPose, mobilePose } from "./particle-timeline";
import {
  copyFragment,
  fullscreenVertex,
  particleFragment,
  particleVertex,
  positionFragment,
  velocityFragment,
  vignetteShader,
} from "./particle-shaders";

const MOBILE_WIDTH = 760;
// Dala: 10 000 particles at scale 1.55 on desktop, 7 000 at 1.2 on small screens.
const DRAWN = { desktop: COUNT, mobile: 7000 } as const;
const SCALE = { desktop: 1.55, mobile: 1.2 } as const;
// Dala's UnrealBloomPass after construction: strength 0.4, radius 1, threshold 0.159.
const BLOOM = { strength: 0.2, radius: 1, threshold: 0.159 } as const;
// Pyramid extent in world units, calibrated to Dala's 10–14 px particles.
const PARTICLE_SIZE = 0.06;
// Thin solid edges need multisampling; the old outline antialiased itself.
const SAMPLES = 4;
const CENTER = new Vector2();

export function createParticleRenderer(
  canvas: HTMLCanvasElement,
  read: () => ParticleController,
  forms: SampledForm[],
): (() => void) | undefined {
  // Everything renders into composer targets, so a multisampled backbuffer
  // would never be used.
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    powerPreference: "low-power",
  });
  if (!gl || !gl.getExtension("EXT_color_buffer_float")) {
    canvas.dataset.renderer = "unavailable";
    return;
  }
  const renderer = new WebGLRenderer({ canvas, context: gl });
  canvas.dataset.entered = "false";
  renderer.setClearColor(0x000000, 1);
  // Dala renders its canvas at a pixel ratio of 1, whatever the screen density.
  renderer.setPixelRatio(1);
  // Display-space pipeline: no sRGB encoding on output, as in Dala's renderer.
  renderer.outputColorSpace = LinearSRGBColorSpace;
  const { textures, uv } = createParticleData(forms);
  const shared = {
    t_position: { value: textures.position },
    t_params: { value: textures.params },
    t_ranks: { value: textures.ranks },
    t_explosion: { value: textures.explosion },
    u_progress: { value: 0 },
    u_progress2: { value: 0 },
    u_explode: { value: 0 },
    u_factor: { value: 4.35 },
    u_show: { value: 0 },
  };
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
  const fullscreenGeometry = new PlaneGeometry(2, 2);
  const fullscreenCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const fullscreenScene = new Scene();
  const simulationMaterial = (
    fragmentShader: string,
    uniforms: Record<string, IUniform>,
  ) =>
    new ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
      blending: NoBlending,
    });
  const velocityMaterial = simulationMaterial(velocityFragment, {
    ...shared,
    t_current: { value: textures.initial },
    t_velocity: { value: textures.zero },
  });
  const positionMaterial = simulationMaterial(positionFragment, {
    t_current: { value: textures.initial },
    t_velocity: { value: textures.zero },
  });
  const copyMaterial = simulationMaterial(copyFragment, {
    t_source: { value: textures.initial },
  });
  const fullscreen = new Mesh(fullscreenGeometry, copyMaterial);
  fullscreenScene.add(fullscreen);
  function pass(material: ShaderMaterial, destination: WebGLRenderTarget) {
    fullscreen.material = material;
    renderer.setRenderTarget(destination);
    renderer.render(fullscreenScene, fullscreenCamera);
  }
  let current = 0;
  function reset() {
    copyMaterial.uniforms.t_source.value = textures.initial;
    positions.forEach((target) => pass(copyMaterial, target));
    copyMaterial.uniforms.t_source.value = textures.zero;
    velocities.forEach((target) => pass(copyMaterial, target));
    current = 0;
  }

  const scene = new Scene();
  const camera = createParticleCamera();
  const geometry = createPyramidGeometry(PARTICLE_SIZE);
  geometry.setAttribute("aSimulationUv", new InstancedBufferAttribute(uv, 2));
  const material = new ShaderMaterial({
    vertexShader: particleVertex,
    fragmentShader: particleFragment,
    uniforms: {
      ...shared,
      t_simulation: { value: positions[0].texture },
      t_color: { value: textures.color },
      t_scale: { value: textures.scale },
      u_offset: { value: new Vector3(3, 0, 0) },
      u_rotation: { value: new Vector3() },
      u_mouse: { value: new Vector2(10, 10) },
      u_delta: { value: new Vector2() },
      u_resolution: { value: new Vector2() },
      u_resolution2: { value: new Vector2() },
      u_time: { value: 0 },
      u_pointer: { value: 0 },
      u_scale: { value: SCALE.desktop },
    },
    transparent: true,
    depthWrite: true,
    depthTest: true,
    side: DoubleSide,
  });
  const particles = new InstancedMesh(geometry, material, COUNT);
  const identity = new Matrix4();
  for (let i = 0; i < COUNT; i++) particles.setMatrixAt(i, identity);
  particles.instanceMatrix.needsUpdate = true;
  particles.frustumCulled = false;
  const backdrop = createBackdrop();
  // Both layers skip the depth test, so draw order decides: backdrop first.
  backdrop.mesh.renderOrder = -1;
  scene.add(backdrop.mesh, particles);

  const composer = new EffectComposer(
    renderer,
    new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: SAMPLES }),
  );
  const bloom = new UnrealBloomPass(
    new Vector2(1, 1),
    BLOOM.strength,
    BLOOM.radius,
    BLOOM.threshold,
  );
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  const vignette = new ShaderPass(vignetteShader);
  const output = new OutputPass();
  composer.addPass(vignette);
  composer.addPass(output);

  const pointer = new PointerMotion();
  const pose = createPose();
  let mobile = false,
    disposed = false,
    lost = false,
    posed = false;
  let previousTime: number | undefined,
    accumulator = 0,
    show = 0;
  let pendingFrame = 0;
  function resize() {
    const width = canvas.clientWidth || innerWidth,
      height = canvas.clientHeight || innerHeight;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    bloom.resolution.set(width, height);
    const extent = frameCamera(camera, width / height);
    material.uniforms.u_resolution.value.copy(extent);
    material.uniforms.u_resolution2.value.copy(extent);
    mobile = width < MOBILE_WIDTH;
    material.uniforms.u_scale.value = mobile ? SCALE.mobile : SCALE.desktop;
    particles.count = mobile ? DRAWN.mobile : DRAWN.desktop;
    backdrop.resize(extent, mobile);
    posed = false;
    requestDraw();
  }
  function simulate() {
    const next = 1 - current;
    velocityMaterial.uniforms.t_current.value = positions[current].texture;
    velocityMaterial.uniforms.t_velocity.value = velocities[current].texture;
    pass(velocityMaterial, velocities[next]);
    // Position reads the newly computed velocity: semi-implicit Euler.
    positionMaterial.uniforms.t_current.value = positions[current].texture;
    positionMaterial.uniforms.t_velocity.value = velocities[next].texture;
    pass(positionMaterial, positions[next]);
    current = next;
  }
  function applyPose(frames: number) {
    const progress = read().progress;
    const target = (mobile ? mobilePose : desktopPose)(progress);
    if (!mobile) {
      target.offset[1] += OBJECT_Y;
    }
    // The first frame jumps straight to the pose.
    easePose(pose, target, posed ? frames : Infinity);
    posed = true;
    shared.u_progress.value = pose.progress;
    shared.u_progress2.value = pose.progress2;
    shared.u_explode.value = pose.explode;
    shared.u_factor.value = pose.factor;
    material.uniforms.u_offset.value.fromArray(pose.offset);
    material.uniforms.u_rotation.value.fromArray(pose.rotation);
    publish("sectionProgress", progress);
    publish("explode", pose.explode);
    publish("progress", pose.progress);
  }
  function publish(key: string, value: number) {
    const text = value.toFixed(3);
    if (canvas.dataset[key] !== text) canvas.dataset[key] = text;
  }
  function applyPointer(frames: number) {
    pointer.step(frames);
    material.uniforms.u_mouse.value.copy(pointer.mouse);
    material.uniforms.u_delta.value.copy(pointer.delta);
    material.uniforms.u_pointer.value = pointer.isActive ? 1 : 0;
    // Same term the shader adds to the hover radius: abs(max(Δx, Δy)).
    publish(
      "pointerSpeed",
      Math.abs(Math.max(pointer.delta.x, pointer.delta.y)),
    );
    // The shader's hover multiplier: abs(u_explode − 1) while a pointer is in.
    publish(
      "hoverGain",
      material.uniforms.u_pointer.value * Math.abs(shared.u_explode.value - 1),
    );
    parallaxCamera(camera, pointer.isActive ? pointer.target : CENTER, frames);
  }
  function draw(time: number) {
    pendingFrame = 0;
    if (disposed || lost || document.hidden) return;
    const now = performance.now();
    const delta =
      previousTime === undefined
        ? STEP
        : Math.min((now - previousTime) / 1000, 0.1);
    previousTime = now;
    const frames = Math.max(0, delta) / STEP;
    applyPose(frames);
    show = Math.min(1, show + Math.max(0, delta) / 1.2);
    shared.u_show.value = show;
    if (show === 1) canvas.dataset.entered = "true";
    const seconds = time / 1000;
    material.uniforms.u_time.value = seconds;
    applyPointer(frames);
    backdrop.update(seconds, pointer.target, pointer.isActive, frames);
    accumulator += Math.max(0, delta);
    let iterations = 0;
    while (accumulator >= STEP && iterations < 6) {
      simulate();
      accumulator -= STEP;
      iterations++;
    }
    material.uniforms.t_simulation.value = positions[current].texture;
    composer.render(delta);
    requestDraw();
  }
  function requestDraw() {
    if (!pendingFrame && !disposed && !lost && !document.hidden)
      pendingFrame = requestAnimationFrame(draw);
  }
  function move(event: PointerEvent) {
    if (event.pointerType !== "mouse" || !event.isPrimary) return;
    pointer.move(
      (event.clientX / innerWidth) * 2 - 1,
      1 - (event.clientY / innerHeight) * 2,
    );
    requestDraw();
  }
  function leave() {
    pointer.leave();
    requestDraw();
  }
  function visibility() {
    cancelAnimationFrame(pendingFrame);
    pendingFrame = 0;
    previousTime = undefined;
    accumulator = 0;
    requestDraw();
  }
  function contextLost(event: Event) {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(pendingFrame);
    pendingFrame = 0;
    canvas.dataset.renderer = "context-lost";
  }
  function contextRestored() {
    lost = false;
    show = 1;
    previousTime = undefined;
    accumulator = 0;
    reset();
    resize();
    canvas.dataset.renderer = "three-gpgpu";
  }
  reset();
  resize();
  canvas.dataset.renderer = "three-gpgpu";
  document.addEventListener("pointermove", move);
  document.documentElement.addEventListener("pointerleave", leave);
  window.addEventListener("blur", leave);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", visibility);
  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("webglcontextrestored", contextRestored);
  return () => {
    disposed = true;
    cancelAnimationFrame(pendingFrame);
    document.removeEventListener("pointermove", move);
    document.documentElement.removeEventListener("pointerleave", leave);
    window.removeEventListener("blur", leave);
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", visibility);
    canvas.removeEventListener("webglcontextlost", contextLost);
    canvas.removeEventListener("webglcontextrestored", contextRestored);
    particles.dispose();
    geometry.dispose();
    fullscreenGeometry.dispose();
    backdrop.dispose();
    [material, velocityMaterial, positionMaterial, copyMaterial].forEach(
      (value) => value.dispose(),
    );
    [...positions, ...velocities].forEach((value) => value.dispose());
    Object.values(textures).forEach((value) => value.dispose());
    composer.dispose();
    [bloom, vignette, output].forEach((value) => value.dispose());
    renderer.dispose();
  };
}
