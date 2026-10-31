import { rotation } from "./common";

/**
 * Background shards stay fixed and shift only in response to the pointer.
 */
export const backdropVertex = /* glsl */ `
attribute vec4 aOrigin;
attribute vec4 aTone;
attribute vec4 aAngle;
uniform vec2 u_extent;
uniform vec2 u_mouse;
uniform float u_scale;
varying vec3 vColor;
varying float vDepth;
varying float vAlpha;
varying float vEmission;
${rotation}
void main() {
  float ph=aAngle.w;
  vec3 world=vec3(aOrigin.xy*u_extent*.5+u_mouse,aOrigin.z);
  vec3 corner=axisAngle(aAngle.xyz,ph)*position*u_scale;
  gl_Position=projectionMatrix*viewMatrix*vec4(billboard(world,corner),1.);
  vColor=aTone.rgb;
  vAlpha=aTone.a;
  vEmission=0.;
  vDepth=4.;
}
`;
