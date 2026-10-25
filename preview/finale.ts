/**
 * Standalone preview of the closing scene (vite: /finale.html). It plays the
 * formation — fragments arriving outwards from the couple — and then the scene
 * alive. `?formed=1` starts complete. Until the scene joins the v6 field, this
 * is where it is reviewed.
 */
import {
  AdditiveBlending,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  HalfFloatType,
  InstancedBufferAttribute,
  InstancedMesh,
  LineSegments,
  LinearSRGBColorSpace,
  Matrix4,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { createPyramidGeometry } from "../src/landing/particles/geometry";
import { CORE, SCENE_WIDTH } from "../src/landing/particles/finale/build";
import { SCENE_URL, decodeScene } from "../src/landing/particles/finale/file";
import { sceneMotion } from "../src/landing/particles/finale/shaders";
import { createTriangleGeometry } from "../src/landing/particles/finale/triangle";

const FACTOR = 4.35; // field frame → world, as the v6 desktop pose
const MOBILE_FACTOR = 3.4; // portrait: the picture keeps its height…
const PAN_SECONDS = 40; // …and the camera crosses it, left to right and back
const FORM_SECONDS = 7;
const SCALE = 1.25; // particle size: the reference's foliage triangles
const PARTICLE_SIZE = 0.06;

const arrival = /* glsl */ `
uniform float u_form;
uniform float u_time;
uniform float u_factor;
uniform float u_pan; // portrait screens: the picture slides under the camera
float stagger(float t,float d,float r) { return clamp(t*(1.+d)-d*r,0.,1.); }
float ease(float x) { return x<.5 ? 4.*x*x*x : 1.-pow(-2.*x+2.,3.)/2.; }
${sceneMotion}
// Fragments come from a loose cloud and arc into place.
// Layer 0: the field's particles; 1: the detail layer, which completes the
// drawing in the last 60% of the formation.
float timeline(float layer) { return layer<.5 ? u_form : clamp((u_form-.4)/.6,0.,1.); }
vec3 place(vec3 target,vec3 start,vec4 motion,float rank,float layer,out float alpha,out float glow,out float st) {
  st=ease(stagger(timeline(layer),4.,rank));
  vec3 p=sceneAnimate(target,motion,u_time,alpha,glow);
  vec3 arc=vec3(0.,sin(3.14159*st)*.35,sin(3.14159*st)*.5);
  return mix(start,p,st)*u_factor+arc*(1.-st)*st*4.+vec3(u_pan,0.,0.);
}
`;

const particleVertex = /* glsl */ `
attribute vec3 aTarget;
attribute vec3 aStart;
attribute vec4 aLook;
attribute vec4 aMotion;
attribute vec2 aRankSeed;
uniform float u_scale;
uniform float u_layer;
varying vec3 vColor;
varying float vEmission;
varying float vAlpha;
varying float vDepth;
${arrival}
mat3 spin(vec3 axis,float a){axis=normalize(axis);float c=cos(a),s=sin(a),t=1.-c;
  return mat3(t*axis.x*axis.x+c,t*axis.x*axis.y+s*axis.z,t*axis.x*axis.z-s*axis.y,
    t*axis.x*axis.y-s*axis.z,t*axis.y*axis.y+c,t*axis.y*axis.z+s*axis.x,
    t*axis.x*axis.z+s*axis.y,t*axis.y*axis.z-s*axis.x,t*axis.z*axis.z+c);}
void main() {
  float alpha,glow,st;
  vec3 world=place(aTarget,aStart,aMotion,aRankSeed.x,u_layer,alpha,glow,st);
  float seed=aRankSeed.y;
  float size=(.35+.8*pow(seed,3.))*u_scale*aMotion.w*2.*(1.+aLook.a*.2);
  vec3 forward=normalize(cameraPosition-world);
  vec3 right=normalize(cross(vec3(0,1,0),forward)),up=cross(forward,right);
  vec3 c=spin(vec3(1,0,1),seed*6.28)*spin(vec3(0,1,1),seed*9.+u_time*(.2+seed))*position*size;
  gl_Position=projectionMatrix*viewMatrix*vec4(world+right*c.x+up*c.y+forward*c.z,1.);
  vColor=aLook.rgb;
  vEmission=aLook.a*glow;
  vAlpha=alpha*smoothstep(0.,.15,st);
  vDepth=world.z;
}
`;

const particleFragment = /* glsl */ `
varying vec3 vColor;
varying float vEmission;
varying float vAlpha;
varying float vDepth;
void main() {
  float alpha=vAlpha*smoothstep(-4.5,4.,vDepth);
  if(alpha<.01) discard;
  vec3 c=mix(vec3(dot(vColor,vec3(.2126,.7152,.0722))),vColor,1.25);
  c=max(c,0.)*(1.1+vEmission*1.1);
  c=mix(c,vec3(1.),smoothstep(.7,1.,vEmission)*.35);
  gl_FragColor=vec4(c,alpha);
}
`;

const lineVertex = /* glsl */ `
attribute vec3 aTarget;
attribute vec3 aStart;
attribute vec4 aLook;
attribute vec4 aMotion;
attribute vec2 aRanks; // this end, the other end
attribute float aLayer;
varying vec3 vColor;
varying float vAlpha;
${arrival}
void main() {
  float alpha,glow,st;
  vec3 world=place(aTarget,aStart,aMotion,aRanks.x,aLayer,alpha,glow,st);
  // A line lights once both of its ends have arrived.
  float both=min(st,ease(stagger(timeline(aLayer),4.,aRanks.y)));
  vColor=mix(aLook.rgb,vec3(1.),.35);
  vAlpha=smoothstep(.85,1.,both)*alpha*(.22+aLook.a*.45);
  gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
}
`;

const lineFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() { gl_FragColor=vec4(vColor*vAlpha,1.); }
`;

const finalShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }",
  // Black floor: empty background stays pixels-off black.
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; const float FLOOR=1.5/255.;
    void main(){ vec3 c=texture2D(tDiffuse,vUv).rgb; gl_FragColor=vec4(max(c-FLOOR,0.)/(1.-FLOOR),1.); }`,
};

async function main() {
  const canvas = document.querySelector<HTMLCanvasElement>("canvas")!;
  const slider = document.querySelector<HTMLInputElement>("#form")!;
  const replay = document.querySelector<HTMLButtonElement>("#replay")!;
  const scene = decodeScene(await (await fetch(SCENE_URL, { cache: "no-cache" })).arrayBuffer());
  const count = scene.ranks.length;

  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = LinearSRGBColorSpace;
  const ratio = Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(ratio);
  const camera = new PerspectiveCamera(50, 1, 0.1, 40);
  camera.position.z = 10;
  const world = new Scene();

  const seeds = Float32Array.from({ length: count * 2 }, (_, i) =>
    i % 2 ? (Math.sin(i * 12.9898) * 43758.5453) % 1 : scene.ranks[i >> 1],
  ).map((v) => Math.abs(v));
  const starts = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    if (i < CORE) {
      // A loose cloud, as if Lia had just dissolved.
      const a = i * 2.399963,
        r = 0.4 + 1.1 * Math.abs(Math.sin(i * 7.31));
      starts.set([Math.cos(a) * r * 1.4, Math.sin(a * 0.7) * r * 0.8, Math.sin(a) * r - 0.4], i * 3);
    } else {
      // Detail grows in place, rising a little towards its spot.
      const j = i * 3;
      starts.set([scene.points[j], scene.points[j + 1] - 0.06, scene.points[j + 2] + 0.1], j);
    }
  }
  const looks = new Float32Array(count * 4);
  for (let i = 0; i < count; i++)
    looks.set([scene.colors[i * 3], scene.colors[i * 3 + 1], scene.colors[i * 3 + 2], scene.emission[i]], i * 4);

  const uniforms = {
    u_form: { value: 0 },
    u_time: { value: 0 },
    u_scale: { value: SCALE },
    u_factor: { value: FACTOR },
    u_pan: { value: 0 },
  };
  const layer = (geometry: BufferGeometry, from: number, to: number, detail: number) => {
    const slice = (source: Float32Array, size: number) => source.subarray(from * size, to * size);
    geometry.setAttribute("aTarget", new InstancedBufferAttribute(slice(scene.points, 3), 3));
    geometry.setAttribute("aStart", new InstancedBufferAttribute(slice(starts, 3), 3));
    geometry.setAttribute("aLook", new InstancedBufferAttribute(slice(looks, 4), 4));
    geometry.setAttribute("aMotion", new InstancedBufferAttribute(slice(scene.motion, 4), 4));
    geometry.setAttribute("aRankSeed", new InstancedBufferAttribute(slice(seeds, 2), 2));
    const mesh = new InstancedMesh(
      geometry,
      new ShaderMaterial({
        vertexShader: particleVertex,
        fragmentShader: particleFragment,
        uniforms: { ...uniforms, u_layer: { value: detail } },
        transparent: true,
        side: DoubleSide,
      }),
      to - from,
    );
    const identity = new Matrix4();
    for (let i = 0; i < to - from; i++) mesh.setMatrixAt(i, identity);
    mesh.frustumCulled = false;
    return mesh;
  };
  const core = layer(createPyramidGeometry(PARTICLE_SIZE), 0, Math.min(CORE, count), 0);
  // The detail triangles are flat: a little larger to match the pyramids' read.
  const details = layer(createTriangleGeometry(PARTICLE_SIZE * 1.15), Math.min(CORE, count), count, 1);

  // Lines: two vertices per edge, each carrying its own end and the other's rank.
  const pairs = scene.edges.length / 2;
  const take = (source: Float32Array, size: number) => {
    const out = new Float32Array(pairs * 2 * size);
    scene.edges.forEach((index, v) => out.set(source.subarray(index * size, index * size + size), v * size));
    return out;
  };
  const ranks = new Float32Array(pairs * 4);
  const lineLayer = new Float32Array(pairs * 2);
  for (let e = 0; e < pairs; e++) {
    const a = scene.edges[e * 2],
      b = scene.edges[e * 2 + 1];
    ranks.set([scene.ranks[a], scene.ranks[b], scene.ranks[b], scene.ranks[a]], e * 4);
    // A line belongs to the detail layer if either end does.
    lineLayer.fill(Math.max(a, b) >= CORE ? 1 : 0, e * 2, e * 2 + 2);
  }
  const lineGeometry = new BufferGeometry();
  lineGeometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(pairs * 6), 3));
  lineGeometry.setAttribute("aTarget", new Float32BufferAttribute(take(scene.points, 3), 3));
  lineGeometry.setAttribute("aStart", new Float32BufferAttribute(take(starts, 3), 3));
  lineGeometry.setAttribute("aLook", new Float32BufferAttribute(take(looks, 4), 4));
  lineGeometry.setAttribute("aMotion", new Float32BufferAttribute(take(scene.motion, 4), 4));
  lineGeometry.setAttribute("aRanks", new Float32BufferAttribute(ranks, 2));
  lineGeometry.setAttribute("aLayer", new Float32BufferAttribute(lineLayer, 1));
  const lines = new LineSegments(
    lineGeometry,
    new ShaderMaterial({
      vertexShader: lineVertex,
      fragmentShader: lineFragment,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  lines.frustumCulled = false;
  world.add(core, details, lines);

  const composer = new EffectComposer(renderer, new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(world, camera));
  composer.addPass(new UnrealBloomPass(new Vector2(1, 1), 0.2, 0.5, 0.55));
  composer.addPass(new ShaderPass(finalShader));
  composer.setPixelRatio(ratio);

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    uniforms.u_factor.value = camera.aspect < 1 ? MOBILE_FACTOR : FACTOR;
  };
  resize();
  addEventListener("resize", resize);
  const pointer = new Vector2();
  addEventListener("pointermove", (e) => pointer.set((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2));

  let started = new URLSearchParams(location.search).get("formed") ? -1e9 : performance.now();
  let scrubbing = false;
  slider.addEventListener("input", () => (scrubbing = true));
  replay.addEventListener("click", () => {
    scrubbing = false;
    started = performance.now();
  });
  const frame = (time: number) => {
    uniforms.u_time.value = time / 1000;
    // How far the picture overhangs the screen on each side, in world units.
    const halfView = 10 * Math.tan((25 * Math.PI) / 180) * camera.aspect;
    const overhang = Math.max(0, (SCENE_WIDTH * uniforms.u_factor.value) / 2 - halfView);
    uniforms.u_pan.value = -overhang * Math.sin(((time / 1000) * 2 * Math.PI) / PAN_SECONDS);
    const form = scrubbing ? Number(slider.value) : Math.min(1, (performance.now() - started) / (FORM_SECONDS * 1000));
    uniforms.u_form.value = form;
    if (!scrubbing) slider.value = String(form);
    // Dala's pointer parallax.
    camera.rotation.y += (-0.075 * pointer.x - camera.rotation.y) * 0.075;
    camera.rotation.x += (0.05 * pointer.y - camera.rotation.x) * 0.075;
    composer.render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

main().catch((error: unknown) => {
  document.body.dataset.error = String(error);
  throw error;
});
