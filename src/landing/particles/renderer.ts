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
import { loadScene } from "./finale/file";
import { DETAIL_DRAWN, createDetailLayer } from "./finale/layer";
import { COUNT, FORM, FORM_LOOK } from "./forms/catalog";
import type { FormData } from "./forms/compose";
import { createPyramidGeometry } from "./geometry";
import { createHoverProbe } from "./hover";
import { createLines } from "./lines";
import { PointerMotion, STEP, createPose, easePose } from "./motion";
import { createPost } from "./post";
import { AdaptiveQuality } from "./quality";
import { particleFragment, particleVertex } from "./shaders/particle";
import { createSimulation } from "./simulation";
import {
  MOBILE_FIGURE_Y,
  pose as poseAt,
  CUBE_CROSSING,
  solutionWeight as solutionWeightAt,
  track,
  type Layout,
} from "./timeline";

const MOBILE_WIDTH = 760;
const TABLET_WIDTH = 1100;
const DRAWN = { desktop: COUNT, tablet: COUNT, mobile: 11000 } as const;
// Particle scale: Dala's 1.55 on desktop; small screens get bigger particles
// so the swarm reads as large there too.
const SCALE = { desktop: 1.55, tablet: 1.5, mobile: 1.5 } as const;
// Pyramid extent in world units, calibrated to Dala's 10–14 px particles.
const PARTICLE_SIZE = 0.06;
const CENTER = new Vector2();
// Three quarters of a 60 Hz frame: 120 Hz renders every other vsync (60 fps),
// 144 Hz every other (72 fps), and 60–75 Hz screens never skip one.
const FRAME_FLOOR_MS = STEP * 1000 * 0.75;
// Share of the viewport the whole scene fills: the header covers the top and
// the footer's text the bottom, and the couple must clear both.
const SCENE_MARGIN = 0.98;
// Desktop: the closing landscape takes this share of the width.
const SCENE_SIDE_SHARE = 0.96;

/** Size and line strength blended between the two forms around `progress`. */
function formLook(progress: number) {
  const k = Math.max(0, Math.min(FORM_LOOK.length - 1, progress));
  const a = FORM_LOOK[Math.floor(k)],
    b = FORM_LOOK[Math.ceil(k)],
    t = k - Math.floor(k);
  return {
    size: a.size + (b.size - a.size) * t,
    lines: a.lines + (b.lines - a.lines) * t,
  };
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
  const quality = new AdaptiveQuality(window.devicePixelRatio || 1);
  // One set of uniform objects, shared by every pass that reads the field.
  const shared = {
    t_position: { value: textures.position },
    t_motion: { value: textures.motion },
    t_params: { value: textures.params },
    t_ranks: { value: textures.ranks },
    t_explosion: { value: textures.explosion },
    u_progress: { value: 0 },
    u_opening: { value: 1 },
    u_explode: { value: 0 },
    u_explodeMix: { value: 0 },
    u_seed: { value: 0 },
    u_page: { value: 0 },
    u_solve: { value: 0 },
    u_factor: { value: 4.35 },
    u_show: { value: 0 },
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
  // The landscape's detail layer arrives after the field; nothing waits.
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
    .catch((error: unknown) =>
      console.error("Closing scene could not be loaded", error),
    );

  const pointer = new PointerMotion();
  const pose = createPose();
  const euler = new Euler(0, 0, 0, "ZYX");
  const rotation4 = new Matrix4();
  const toCamera = new Vector3(),
    turn = new Quaternion();
  const extent = new Vector2(14.9, 9.33);
  const fitEuler = new Euler(0, 0, 0, "ZYX");
  const fitRotation = new Matrix4();
  const fitPoint = new Vector3();
  // Conservative radii include depth, so portrait screens also fit a tilted form.
  const radii = forms.map((form) => {
    let radius = 0;
    for (let i = 0; i < form.points.length; i += 3)
      radius = Math.max(
        radius,
        Math.hypot(form.points[i], form.points[i + 1], form.points[i + 2]),
      );
    return radius;
  });
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
    layout =
      width < MOBILE_WIDTH
        ? "mobile"
        : width < TABLET_WIDTH
          ? "tablet"
          : "desktop";
    particles.count = DRAWN[layout];
    view.u_drawn.value = DRAWN[layout];
    probe.setDrawn(DRAWN[layout]);
    detail?.setDrawn(DETAIL_DRAWN[layout]);
    backdrop.resize(extent, layout !== "desktop");
    canvas.dataset.pixelRatio = quality.ratio.toFixed(2);
    // A pixel-ratio step mid-scroll must not make the pose jump.
    if (reason !== "quality") posed = false;
    requestDraw();
  }
  function publish(key: string, value: number) {
    const text = value.toFixed(3);
    if (canvas.dataset[key] !== text) canvas.dataset[key] = text;
  }
  function applyPose(frames: number) {
    const progress = read().progress;
    // The first frame jumps straight to the pose.
    const targetPose = poseAt(progress, layout);
    // Saturn's broad rings fill most of its column or the phone's full width.
    const saturnWeight = Math.max(
      0,
      1 - Math.abs(targetPose.progress - FORM.saturn),
    );
    const saturnFit = Math.min(
      targetPose.factor,
      (extent.x * (layout === "desktop" ? 0.92 : 1.05)) / 2.05,
    );
    targetPose.factor += (saturnFit - targetPose.factor) * saturnWeight;
    if (layout !== "desktop") {
      const a = Math.floor(targetPose.progress);
      const t = targetPose.progress - a;
      const radius =
        radii[a] + (radii[Math.ceil(targetPose.progress)] - radii[a]) * t;
      // Account for perspective at the nearest point of the bounding sphere.
      const diameter = Math.min(extent.x * 0.98, extent.y * 0.55);
      const fit = diameter / (radius * (2 + diameter / 10));
      // Book and atom are placed and scaled on their own to fill the screen,
      // and Saturn fits the width above; the atlas radius would shrink both
      // back to a thumbnail.
      const ownScale = Math.max(
        0,
        1 - Math.abs(targetPose.progress - FORM.bookAtom),
        saturnWeight,
      );
      const fitted = Math.min(targetPose.factor, fit);
      targetPose.factor = fitted + (targetPose.factor - fitted) * ownScale;
    } else if (targetPose.progress < FORM.bookAtom) {
      // Fit the tilted silhouette vertically after lowering it. Sampling the
      // dense mesh avoids shrinking the desktop forms to a bounding sphere.
      fitRotation.makeRotationFromEuler(
        fitEuler.set(...targetPose.rotation, "ZYX"),
      );
      const lower = -extent.y * 0.46,
        upper = extent.y * 0.38;
      for (
        let k = Math.floor(targetPose.progress);
        k <= Math.ceil(targetPose.progress);
        k++
      ) {
        const points = forms[k].points;
        for (let i = 0; i < points.length; i += 96) {
          fitPoint.fromArray(points, i).applyMatrix4(fitRotation);
          const bottom = 10 * fitPoint.y + lower * fitPoint.z;
          const top = 10 * fitPoint.y + upper * fitPoint.z;
          if (bottom < -0.0001)
            targetPose.factor = Math.min(
              targetPose.factor,
              (10 * (lower - targetPose.offset[1])) / bottom,
            );
          if (top > 0.0001)
            targetPose.factor = Math.min(
              targetPose.factor,
              (10 * (upper - targetPose.offset[1])) / top,
            );
        }
      }
    }
    // The solutions: the cube stays opposite the copy. Desktop crosses from
    // the right to the left; stacked screens keep it under the copy.
    const solutionWeight = solutionWeightAt(progress);
    if (solutionWeight > 0) {
      const side = layout === "desktop";
      const direction = track(progress, CUBE_CROSSING);
      const x = extent.x * (side ? 0.22 : 0.12) * direction;
      const y = side ? -0.2 : -extent.y * 0.26;
      const fit = Math.min(
        targetPose.factor,
        (extent.x * (side ? 0.5 : 0.7)) / 1.5,
        (extent.y * (side ? 0.8 : 0.36)) / 1.5,
      );
      targetPose.offset[0] += (x - targetPose.offset[0]) * solutionWeight;
      targetPose.offset[1] += (y - targetPose.offset[1]) * solutionWeight;
      targetPose.factor += (fit - targetPose.factor) * solutionWeight;
    }
    easePose(pose, targetPose, posed ? frames : Infinity);
    posed = true;
    const shown = { offset: [...pose.offset], rotation: pose.rotation };
    // The opening picture fits beside (desktop) or below (stacked) the copy.
    const sceneFit = fitScene();
    const factor = pose.factor + (sceneFit.factor - pose.factor) * pose.scene;
    shown.offset[0] += (sceneFit.x - shown.offset[0]) * pose.scene;
    shown.offset[1] += (sceneFit.y - shown.offset[1]) * pose.scene;
    shared.u_progress.value = pose.progress;
    shared.u_opening.value = pose.scene;
    shared.u_explode.value = pose.explode;
    shared.u_explodeMix.value = pose.explodeMix;
    shared.u_seed.value = pose.seed;
    shared.u_page.value = pose.page;
    shared.u_solve.value = pose.solve;
    shared.u_factor.value = factor;
    // Book and atom are placed in world units; the field frame is ÷ factor.
    const f = Math.max(0.01, factor);
    shared.u_book.value.set(
      pose.book[0] / f,
      pose.book[1] / f,
      pose.book[2] / f,
      pose.book[3],
    );
    shared.u_atom.value.set(
      pose.atom[0] / f,
      pose.atom[1] / f,
      pose.atom[2] / f,
      pose.atom[3],
    );
    face(shared.u_bookFace.value, pose.book, pose.offset);
    face(shared.u_atomFace.value, pose.atom, pose.offset);
    view.u_offset.value.fromArray(shown.offset);
    euler.set(shown.rotation[0], shown.rotation[1], shown.rotation[2], "ZYX");
    view.u_rot.value.setFromMatrix4(rotation4.makeRotationFromEuler(euler));
    lines.update(pose.progress);
    lines.mesh.visible &&= pose.scene < 0.01;
    detail?.update(pose.detail);
    const regularLook = formLook(pose.progress);
    const openingLook = FORM_LOOK[FORM.finale];
    const look = {
      size: regularLook.size + (openingLook.size - regularLook.size) * pose.scene,
      lines:
        regularLook.lines + (openingLook.lines - regularLook.lines) * pose.scene,
    };
    view.u_scale.value = SCALE[layout] * look.size;
    view.u_lineGain.value = look.lines;
    publish("sectionProgress", progress);
    publish("explode", pose.explode);
    publish("progress", pose.progress);
    publish("opening", pose.scene);
    publish("figureY", shown.offset[1]);
    publish("factor", factor);
  }
  /**
   * Where the closing landscape stands, as `object-fit: contain`, centred:
   * most of the width on desktop, the whole width below the copy elsewhere.
   */
  function fitScene() {
    const side = layout === "desktop";
    const factor = Math.min(
      (extent.x * (side ? SCENE_SIDE_SHARE : SCENE_MARGIN)) / SCENE_WIDTH,
      (extent.y * (side ? 0.86 : 0.55)) / SCENE_HEIGHT,
    );
    return { factor, x: 0, y: side ? -0.2 : MOBILE_FIGURE_Y };
  }
  /** Turn a group placed off-centre so it faces the camera, as if centred. */
  function face(
    out: Matrix3,
    at: readonly number[],
    offset: readonly number[],
  ) {
    toCamera
      .set(
        -(at[0] + offset[0]),
        -(at[1] + offset[1]),
        camera.position.z - (at[2] + offset[2]),
      )
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
    publish(
      "pointerSpeed",
      Math.max(Math.abs(pointer.delta.x), Math.abs(pointer.delta.y)),
    );
    publish("hoverGain", view.u_pointer.value * view.u_hoverGain.value);
    parallaxCamera(camera, pointer.isActive ? pointer.target : CENTER, frames);
    probe.update(
      camera,
      pointer.mouse,
      pointer.isActive,
      view.u_rayOrigin.value,
      view.u_rayDir.value,
    );
    publish("hoverHit", probe.hit ? 1 : 0);
  }
  function draw(time: number) {
    pendingFrame = 0;
    if (disposed || lost || document.hidden) return;
    const now = performance.now();
    // The simulation and every ease run at 60 Hz, so 120/144 Hz screens
    // would render frames identical in motion at twice the GPU cost.
    if (previousTime !== undefined && now - previousTime < FRAME_FLOOR_MS) {
      requestDraw();
      return;
    }
    const raw = previousTime === undefined ? STEP * 1000 : now - previousTime;
    const delta = Math.min(raw / 1000, 0.1);
    previousTime = now;
    const frames = Math.max(0, delta) / STEP;
    const seconds = time / 1000;
    applyPose(frames);
    // Time drives only each element's own path, without moving the whole figure
    shared.u_clock.value = seconds;
    show = Math.min(1, show + Math.max(0, delta) / 1.2);
    shared.u_show.value = show;
    if (show === 1) canvas.dataset.entered = "true";
    backdrop.update(pointer.target, pointer.isActive, frames);
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
