import {
  DoubleSide,
  Euler,
  InstancedBufferAttribute,
  InstancedMesh,
  LinearSRGBColorSpace,
  Matrix3,
  Matrix4,
  Quaternion,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";
import type { ParticleController } from "../ParticleField";
import { createBackdrop } from "./backdrop";
import { createParticleCamera, frameCamera, parallaxCamera } from "./camera";
import { createParticleData } from "./data";
import { SCENE_HEIGHT, SCENE_WIDTH } from "./finale/build";
import { STILL_EASE, STILL_TOLERANCE, advanceClock } from "./stillness";
import { loadScene } from "./finale/file";
import { DETAIL_DRAWN, createDetailLayer } from "./finale/layer";
import { COUNT, FORM, FORM_LOOK } from "./forms/catalog";
import type { FormData } from "./forms/compose";
import { createPyramidGeometry } from "./geometry";
import { createHoverProbe } from "./hover";
import { createLines } from "./lines";
import { PointerMotion, STEP, createPose, easePose, vacuum } from "./motion";
import { createPost } from "./post";
import { AdaptiveQuality } from "./quality";
import { particleFragment, particleVertex } from "./shaders/particle";
import { createSimulation } from "./simulation";
import { MOBILE_FIGURE_Y, pose as poseAt, type Layout } from "./timeline";

const MOBILE_WIDTH = 760;
const TABLET_WIDTH = 1100;
const DRAWN = { desktop: COUNT, tablet: COUNT, mobile: 11000 } as const;
// Particle scale: Dala's 1.55 on desktop; small screens get bigger particles
// so the swarm reads as large there too.
const SCALE = { desktop: 1.55, tablet: 1.5, mobile: 1.5 } as const;
// Pyramid extent in world units, calibrated to Dala's 10–14 px particles.
const PARTICLE_SIZE = 0.06;
const CENTER = new Vector2();
// Share of the viewport the whole scene fills: the header covers the top and
// the footer's text the bottom, and the couple must clear both.
const SCENE_MARGIN = 0.78;
// Desktop: the scene takes this share of the width, right of the contact copy,
// at this distance (world units) from the right edge.
const SCENE_SIDE_SHARE = 0.56;
const SCENE_EDGE = 0.35;

/** Size and line strength blended between the two forms around `progress`. */
function formLook(progress: number) {
  const k = Math.max(0, Math.min(FORM_LOOK.length - 1, progress));
  const a = FORM_LOOK[Math.floor(k)],
    b = FORM_LOOK[Math.ceil(k)],
    t = k - Math.floor(k);
  return { size: a.size + (b.size - a.size) * t, lines: a.lines + (b.lines - a.lines) * t };
}
const FORWARD = new Vector3(0, 0, 1);

export function createParticleRenderer(
  canvas: HTMLCanvasElement,
  read: () => ParticleController,
  forms: FormData[],
): (() => void) | undefined {
  // Everything renders into composer targets, so a multisampled backbuffer
  // would never be used.
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    powerPreference: "high-performance",
  });
  if (!gl || !gl.getExtension("EXT_color_buffer_float")) {
    canvas.dataset.renderer = "unavailable";
    return;
  }
  // Validates the forms before any GPU resource exists.
  const { textures, uv, edges } = createParticleData(forms);
  const renderer = new WebGLRenderer({ canvas, context: gl });
  canvas.dataset.entered = "false";
  renderer.setClearColor(0x000000, 1);
  // Display-space pipeline: no sRGB encoding on output, as in Dala's renderer.
  renderer.outputColorSpace = LinearSRGBColorSpace;
  const quality = new AdaptiveQuality(
    window.devicePixelRatio || 1,
    innerWidth < MOBILE_WIDTH,
  );
  // One set of uniform objects, shared by every pass that reads the field.
  const shared = {
    t_position: { value: textures.position },
    t_motion: { value: textures.motion },
    t_params: { value: textures.params },
    t_ranks: { value: textures.ranks },
    t_explosion: { value: textures.explosion },
    u_progress: { value: 0 },
    u_explode: { value: 0 },
    u_explodeMix: { value: 0 },
    u_seed: { value: 0 },
    u_page: { value: 0 },
    u_factor: { value: 4.35 },
    u_show: { value: 0 },
    u_time: { value: 0 },
    u_clock: { value: 0 },
    u_book: { value: new Vector4(0, 0, 0, 1) },
    u_atom: { value: new Vector4(0, 0, 0, 1) },
    u_bookFace: { value: new Matrix3() },
    u_atomFace: { value: new Matrix3() },
  };
  const simulation = createSimulation(renderer, shared, textures);
  const view = {
    t_simulation: { value: simulation.position },
    t_look: { value: simulation.look },
    u_rot: { value: new Matrix3() },
    u_offset: { value: new Vector3(3, 0, 0) },
    u_rayOrigin: { value: new Vector3() },
    u_rayDir: { value: new Vector3(0, 0, -1) },
    u_pointer: { value: 0 },
    u_delta: { value: new Vector2() },
    u_hoverGain: { value: 1 },
    u_scale: { value: SCALE.desktop as number },
    u_lineGain: { value: 1 },
    u_drawn: { value: COUNT as number },
  };
  const probe = createHoverProbe(renderer, uv, { ...shared, ...view });
  const uniforms = { ...shared, ...view, t_hit: { value: probe.texture } };

  const scene = new Scene();
  const camera = createParticleCamera();
  const geometry = createPyramidGeometry(PARTICLE_SIZE);
  geometry.setAttribute("aSimulationUv", new InstancedBufferAttribute(uv, 2));
  const material = new ShaderMaterial({
    vertexShader: particleVertex,
    fragmentShader: particleFragment,
    uniforms,
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
  const lines = createLines(edges, uniforms);
  const backdrop = createBackdrop();
  // The backdrop skips the depth test, so draw order decides: backdrop first.
  backdrop.mesh.renderOrder = -1;
  lines.mesh.renderOrder = 1;
  scene.add(backdrop.mesh, particles, lines.mesh);
  const post = createPost(renderer, scene, camera);
  // The closing scene's detail layer arrives after the field; nothing waits.
  let detail: ReturnType<typeof createDetailLayer> | undefined;
  loadScene()
    .then((sceneForm) => {
      if (disposed) return;
      detail = createDetailLayer(
        sceneForm,
        {
          u_clock: shared.u_clock,
          u_factor: shared.u_factor,
          u_scale: view.u_scale,
          u_rot: view.u_rot,
          u_offset: view.u_offset,
        },
        PARTICLE_SIZE,
      );
      detail.setDrawn(DETAIL_DRAWN[layout]);
      scene.add(...detail.meshes);
    })
    .catch((error: unknown) => console.error("Closing scene could not be loaded", error));

  const pointer = new PointerMotion();
  const pose = createPose();
  const euler = new Euler(0, 0, 0, "ZYX");
  const rotation4 = new Matrix4();
  const toCamera = new Vector3(),
    turn = new Quaternion();
  const extent = new Vector2(14.9, 9.33);
  let clock = 0,
    lastSeconds = 0,
    still = 0;
  let layout: Layout = "desktop",
    disposed = false,
    lost = false,
    posed = false;
  let previousTime: number | undefined,
    accumulator = 0,
    show = 0,
    pendingFrame = 0;
  /** Resize the targets; a layout change also re-snaps the pose. */
  function resize(reason?: "quality") {
    const width = canvas.clientWidth || innerWidth,
      height = canvas.clientHeight || innerHeight;
    renderer.setPixelRatio(quality.ratio);
    renderer.setSize(width, height, false);
    post.resize(width, height, quality.ratio);
    // Visible extent at z = 0: 2·d·tan(fov/2) high, times the aspect wide.
    extent.copy(frameCamera(camera, width / height));
    layout = width < MOBILE_WIDTH ? "mobile" : width < TABLET_WIDTH ? "tablet" : "desktop";
    particles.count = DRAWN[layout];
    view.u_drawn.value = DRAWN[layout];
    probe.setDrawn(DRAWN[layout]);
    detail?.setDrawn(DETAIL_DRAWN[layout]);
    backdrop.resize(extent, layout === "mobile");
    canvas.dataset.pixelRatio = quality.ratio.toFixed(2);
    // A pixel-ratio step mid-scroll must not make the pose jump.
    if (reason !== "quality") posed = false;
    requestDraw();
  }
  function publish(key: string, value: number) {
    const text = value.toFixed(3);
    if (canvas.dataset[key] !== text) canvas.dataset[key] = text;
  }
  function applyPose(frames: number, seconds: number) {
    const progress = read().progress;
    // The first frame jumps straight to the pose.
    easePose(pose, poseAt(progress, layout), posed ? frames : Infinity);
    posed = true;
    const shown = vacuum(pose, clock);
    // Into the closing scene the size and place blend to where the whole
    // picture fits beside (desktop) or below (smaller screens) the contact copy.
    const sceneFit = fitScene();
    const factor = pose.factor + (sceneFit.factor - pose.factor) * pose.scene;
    shown.offset[0] += (sceneFit.x - shown.offset[0]) * pose.scene;
    shown.offset[1] += (sceneFit.y - shown.offset[1]) * pose.scene;
    shared.u_progress.value = pose.progress;
    shared.u_explode.value = pose.explode;
    shared.u_explodeMix.value = pose.explodeMix;
    shared.u_seed.value = pose.seed;
    shared.u_page.value = pose.page;
    shared.u_factor.value = factor;
    // Book and atom are placed in world units; the field frame is ÷ factor.
    const f = Math.max(0.01, factor);
    shared.u_book.value.set(pose.book[0] / f, pose.book[1] / f, pose.book[2] / f, pose.book[3]);
    shared.u_atom.value.set(pose.atom[0] / f, pose.atom[1] / f, pose.atom[2] / f, pose.atom[3]);
    face(shared.u_bookFace.value, pose.book, pose.offset);
    face(shared.u_atomFace.value, pose.atom, pose.offset);
    view.u_offset.value.fromArray(shown.offset);
    euler.set(shown.rotation[0], shown.rotation[1], shown.rotation[2], "ZYX");
    view.u_rot.value.setFromMatrix4(rotation4.makeRotationFromEuler(euler));
    lines.update(pose.progress);
    detail?.update(pose.detail);
    const look = formLook(pose.progress);
    view.u_scale.value = SCALE[layout] * look.size;
    view.u_lineGain.value = look.lines;
    publish("sectionProgress", progress);
    publish("explode", pose.explode);
    publish("progress", pose.progress);
  }
  /**
   * Where the closing scene stands, as `object-fit: contain` in the free area:
   * on desktop the right 56% beside the contact copy, hugging the right edge;
   * on smaller screens the whole width, below the copy.
   */
  function fitScene() {
    const side = layout === "desktop";
    const factor = Math.min(
      (extent.x * (side ? SCENE_SIDE_SHARE : SCENE_MARGIN)) / SCENE_WIDTH,
      (extent.y * SCENE_MARGIN) / SCENE_HEIGHT,
    );
    return {
      factor,
      x: side ? extent.x / 2 - (SCENE_WIDTH * factor) / 2 - SCENE_EDGE : 0,
      // Smaller screens: the upper half, above the contact copy.
      y: side ? 0.45 : MOBILE_FIGURE_Y - 0.2,
    };
  }
  /** Turn a group placed off-centre so it faces the camera, as if centred. */
  function face(out: Matrix3, at: readonly number[], offset: readonly number[]) {
    toCamera
      .set(-(at[0] + offset[0]), -(at[1] + offset[1]), camera.position.z - (at[2] + offset[2]))
      .normalize();
    turn.setFromUnitVectors(FORWARD, toCamera);
    out.setFromMatrix4(rotation4.makeRotationFromQuaternion(turn));
  }
  function applyPointer(frames: number) {
    pointer.step(frames);
    view.u_delta.value.copy(pointer.delta);
    view.u_pointer.value = pointer.isActive ? 1 : 0;
    // Hover fades out while the field is exploded: |explode − 1|.
    view.u_hoverGain.value = Math.abs(shared.u_explode.value - 1);
    // Same term the shader adds to the hover radius: max(|Δx|, |Δy|).
    publish("pointerSpeed", Math.max(Math.abs(pointer.delta.x), Math.abs(pointer.delta.y)));
    publish("hoverGain", view.u_pointer.value * view.u_hoverGain.value);
    parallaxCamera(camera, pointer.isActive ? pointer.target : CENTER, frames);
    probe.update(camera, pointer.mouse, pointer.isActive, view.u_rayOrigin.value, view.u_rayDir.value);
    publish("hoverHit", probe.hit ? 1 : 0);
  }
  function draw(time: number) {
    pendingFrame = 0;
    if (disposed || lost || document.hidden) return;
    const now = performance.now();
    const raw = previousTime === undefined ? STEP * 1000 : now - previousTime;
    const delta = Math.min(raw / 1000, 0.1);
    previousTime = now;
    const frames = Math.max(0, delta) / STEP;
    const seconds = time / 1000;
    shared.u_time.value = seconds;
    applyPose(frames, seconds);
    // Involuntary motion (the vacuum float, orbits, sway, water, smoke…) rests
    // while a form is complete; hover, scroll and transitions keep working.
    const formed =
      show === 1 &&
      Math.abs(pose.progress - Math.round(pose.progress)) < STILL_TOLERANCE &&
      pose.explode < STILL_TOLERANCE &&
      // u_seed stays at 1 once the tree has grown from it: only the gathering
      // before the tree (progress still below it) is "not formed".
      (pose.seed < STILL_TOLERANCE || pose.progress > FORM.tree - STILL_TOLERANCE);
    still += ((formed ? 1 : 0) - still) * (1 - (1 - STILL_EASE) ** frames);
    // Driven by the animation timestamp, like u_time: a page that pins that
    // clock freezes the ambient motion too.
    clock = advanceClock(clock, Math.min(Math.max(0, seconds - lastSeconds), 0.1), still);
    lastSeconds = seconds;
    shared.u_clock.value = clock;
    show = Math.min(1, show + Math.max(0, delta) / 1.2);
    shared.u_show.value = show;
    if (show === 1) canvas.dataset.entered = "true";
    backdrop.update(seconds, pointer.target, pointer.isActive, frames);
    accumulator += Math.max(0, delta);
    let iterations = 0;
    // At most 3 catch-up steps: a hitch never turns into a burst of work.
    while (accumulator >= STEP && iterations < 3) {
      simulation.step();
      accumulator -= STEP;
      iterations++;
    }
    if (iterations === 3) accumulator = 0;
    view.t_simulation.value = simulation.position;
    simulation.resolveLook();
    applyPointer(frames);
    renderer.setRenderTarget(null);
    post.render(delta);
    if (quality.sample(raw)) resize("quality");
    requestDraw();
  }
  function requestDraw() {
    if (!pendingFrame && !disposed && !lost && !document.hidden)
      pendingFrame = requestAnimationFrame(draw);
  }
  function move(event: PointerEvent) {
    if (event.pointerType !== "mouse" || !event.isPrimary) return;
    pointer.move((event.clientX / innerWidth) * 2 - 1, 1 - (event.clientY / innerHeight) * 2);
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
    simulation.reset();
    resize();
    canvas.dataset.renderer = "three-gpgpu";
  }
  simulation.reset();
  resize();
  canvas.dataset.renderer = "three-gpgpu";
  document.addEventListener("pointermove", move);
  document.documentElement.addEventListener("pointerleave", leave);
  window.addEventListener("blur", leave);
  const onResize = () => resize();
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", visibility);
  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("webglcontextrestored", contextRestored);
  return () => {
    disposed = true;
    cancelAnimationFrame(pendingFrame);
    document.removeEventListener("pointermove", move);
    document.documentElement.removeEventListener("pointerleave", leave);
    window.removeEventListener("blur", leave);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", visibility);
    canvas.removeEventListener("webglcontextlost", contextLost);
    canvas.removeEventListener("webglcontextrestored", contextRestored);
    particles.dispose();
    geometry.dispose();
    material.dispose();
    lines.dispose();
    detail?.dispose();
    probe.dispose();
    backdrop.dispose();
    simulation.dispose();
    Object.values(textures).forEach((value) => value.dispose());
    post.dispose();
    renderer.dispose();
  };
}
