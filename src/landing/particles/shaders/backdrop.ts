import { rotation } from "./common";

/**
 * Background shards: each spins and drifts on its own slow orbit, as if
 * floating in a vacuum, and shifts a little with the pointer.
 */
export const backdropVertex = /* glsl */ `
attribute vec4 aOrigin;
attribute vec4 aTone;
attribute vec4 aAngle;
uniform vec2 u_extent;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_scale;
varying vec3 vColor;
varying float vDepth;
varying float vAlpha;
varying float vEmission;
${rotation}
void main() {
  float ph=aAngle.w;
  vec3 drift=vec3(sin(u_time*.11+ph),cos(u_time*.09+ph*1.7),sin(u_time*.07+ph*2.3))*vec3(.22,.18,.35);
  vec3 world=vec3(aOrigin.xy*u_extent*.5+u_mouse,aOrigin.z)+drift;
  vec3 corner=axisAngle(aAngle.xyz,ph+u_time*.25)*position*u_scale;
  gl_Position=projectionMatrix*viewMatrix*vec4(billboard(world,corner),1.);
  vColor=aTone.rgb;
  vAlpha=aTone.a;
  vEmission=0.;
  vDepth=4.;
}
`;
