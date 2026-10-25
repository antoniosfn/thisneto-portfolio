import {
  AdditiveBlending,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedMesh,
  LineSegments,
  Matrix4,
  ShaderMaterial,
  type IUniform,
} from "three";
import { random } from "../forms/hash";
import { lineFragment } from "../shaders/lines";
import { particleFragment } from "../shaders/particle";
import { CORE, type SceneForm } from "./build";
import { sceneMotion } from "./shaders";
import { createTriangleGeometry } from "./triangle";

/** Small screens draw a prefix of the detail (indices are shuffled). */
export const DETAIL_DRAWN = { desktop: Infinity, tablet: 24000, mobile: 14000 } as const;

const common = /* glsl */ `
uniform float u_detail; // 0 → 1: the layer completes the drawing
uniform float u_clock; // stops while the scene is complete
uniform float u_factor;
uniform float u_scale;
uniform mat3 u_rot;
uniform vec3 u_offset;
float stagger(float t,float d,float r) { return clamp(t*(1.+d)-d*r,0.,1.); }
float ease(float x) { return x<.5 ? 4.*x*x*x : 1.-pow(-2.*x+2.,3.)/2.; }
${sceneMotion}
// Detail grows in place, rising a little into its spot, outwards from the couple.
vec3 place(vec3 target,vec4 motion,float rank,out float alpha,out float glow,out float st) {
  st=ease(stagger(u_detail,4.,rank));
  vec3 p=sceneAnimate(target,motion,u_clock,alpha,glow)+vec3(0.,-.06,.1)*(1.-st);
  return u_rot*(p*u_factor)+u_offset;
}
`;

const detailVertex = /* glsl */ `
attribute vec3 aTarget;
attribute vec4 aLook;
attribute vec4 aMotion;
attribute vec2 aRankSeed;
varying vec3 vColor;
varying float vEmission;
varying float vAlpha;
varying float vDepth;
${common}
mat3 spin(vec3 axis,float a){axis=normalize(axis);float c=cos(a),s=sin(a),t=1.-c;
  return mat3(t*axis.x*axis.x+c,t*axis.x*axis.y+s*axis.z,t*axis.x*axis.z-s*axis.y,
    t*axis.x*axis.y-s*axis.z,t*axis.y*axis.y+c,t*axis.y*axis.z+s*axis.x,
    t*axis.x*axis.z+s*axis.y,t*axis.y*axis.z-s*axis.x,t*axis.z*axis.z+c);}
void main() {
  float alpha,glow,st;
  vec3 world=place(aTarget,aMotion,aRankSeed.x,alpha,glow,st);
  float seed=aRankSeed.y;
  float size=(.35+.8*pow(seed,3.))*u_scale*aMotion.w*2.*(1.+aLook.a*.2)*step(.001,st);
  vec3 forward=normalize(cameraPosition-world);
  vec3 right=normalize(cross(vec3(0,1,0),forward)),up=cross(forward,right);
  vec3 c=spin(vec3(1,0,1),seed*6.28)*spin(vec3(0,1,1),seed*9.+u_clock*(.2+seed))*position*size;
  gl_Position=projectionMatrix*viewMatrix*vec4(world+right*c.x+up*c.y+forward*c.z,1.);
  vColor=aLook.rgb;
  vEmission=aLook.a*glow;
  vAlpha=alpha*smoothstep(0.,.3,st);
  vDepth=world.z;
}
`;

const detailLineVertex = /* glsl */ `
attribute vec3 aTarget;
attribute vec4 aLook;
attribute vec4 aMotion;
attribute vec2 aRanks; // this end, the other end
varying vec3 vColor;
varying float vAlpha;
varying float vDepth;
${common}
void main() {
  float alpha,glow,st;
  vec3 world=place(aTarget,aMotion,aRanks.x,alpha,glow,st);
  // A line lights once both of its ends have arrived.
  float both=min(st,ease(stagger(u_detail,4.,aRanks.y)));
  vColor=mix(aLook.rgb,vec3(1.),.35);
  vAlpha=smoothstep(.85,1.,both)*alpha*(.22+aLook.a*.45);
  vDepth=world.z;
  gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
}
`;

/**
 * The closing scene's detail layer: the picture's particles beyond the field's
 * CORE, drawn as light triangles (6 triangles each), and every line that
 * touches one of them. Not simulated: each particle grows into its place as
 * the formation reaches it, then moves with its region.
 */
export function createDetailLayer(
  scene: SceneForm,
  shared: Record<string, IUniform>,
  particleSize: number,
) {
  const count = scene.ranks.length - CORE;
  const looks = new Float32Array(scene.ranks.length * 4);
  for (let i = 0; i < scene.ranks.length; i++)
    looks.set([scene.colors[i * 3], scene.colors[i * 3 + 1], scene.colors[i * 3 + 2], scene.emission[i]], i * 4);
  const rankSeed = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) rankSeed.set([scene.ranks[CORE + i], random(CORE + i, 3)], i * 2);
  const uniforms = { ...shared, u_detail: { value: 0 } };

  // The flat triangles read a little smaller than pyramids: compensate.
  const geometry = createTriangleGeometry(particleSize * 1.15);
  geometry.setAttribute("aTarget", new InstancedBufferAttribute(scene.points.slice(CORE * 3), 3));
  geometry.setAttribute("aLook", new InstancedBufferAttribute(looks.slice(CORE * 4), 4));
  geometry.setAttribute("aMotion", new InstancedBufferAttribute(scene.motion.slice(CORE * 4), 4));
  geometry.setAttribute("aRankSeed", new InstancedBufferAttribute(rankSeed, 2));
  const material = new ShaderMaterial({
    vertexShader: detailVertex,
    fragmentShader: particleFragment,
    uniforms,
    transparent: true,
    side: DoubleSide,
  });
  const mesh = new InstancedMesh(geometry, material, count);
  const identity = new Matrix4();
  for (let i = 0; i < count; i++) mesh.setMatrixAt(i, identity);
  mesh.frustumCulled = false;

  // Lines with an end in the detail; the field draws those between its own.
  const pairs: number[] = [];
  for (let e = 0; e < scene.edges.length; e += 2)
    if (Math.max(scene.edges[e], scene.edges[e + 1]) >= CORE) pairs.push(scene.edges[e], scene.edges[e + 1]);
  const take = (source: Float32Array, size: number) => {
    const out = new Float32Array(pairs.length * size);
    pairs.forEach((index, v) => out.set(source.subarray(index * size, index * size + size), v * size));
    return out;
  };
  const ranks = new Float32Array(pairs.length * 2);
  for (let e = 0; e < pairs.length; e += 2) {
    const a = scene.ranks[pairs[e]],
      b = scene.ranks[pairs[e + 1]];
    ranks.set([a, b, b, a], e * 2);
  }
  const lineGeometry = new BufferGeometry();
  lineGeometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(pairs.length * 3), 3));
  lineGeometry.setAttribute("aTarget", new Float32BufferAttribute(take(scene.points, 3), 3));
  lineGeometry.setAttribute("aLook", new Float32BufferAttribute(take(looks, 4), 4));
  lineGeometry.setAttribute("aMotion", new Float32BufferAttribute(take(scene.motion, 4), 4));
  lineGeometry.setAttribute("aRanks", new Float32BufferAttribute(ranks, 2));
  const lineMaterial = new ShaderMaterial({
    vertexShader: detailLineVertex,
    fragmentShader: lineFragment,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const lines = new LineSegments(lineGeometry, lineMaterial);
  lines.frustumCulled = false;

  return {
    meshes: [mesh, lines] as const,
    update(detail: number) {
      uniforms.u_detail.value = detail;
      const visible = detail > 0.001;
      mesh.visible = lines.visible = visible;
    },
    /** Draw a prefix of the detail on smaller screens. */
    setDrawn(limit: number) {
      mesh.count = Math.min(count, limit);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
    },
  };
}
