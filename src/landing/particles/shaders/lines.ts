import { SIDE } from "../forms/catalog";
import { hoverFunctions } from "./hover";
import { decodeLook } from "./simulation";

/**
 * Lines of light between neighbouring nodes of a form. Both ends are read from
 * the simulation; a line shows only while its form is on screen and its length
 * stays near the length it has in the form, so lines vanish in every burst and
 * light up again as the form completes.
 */
export const lineVertex = /* glsl */ `
attribute vec2 aA;
attribute vec2 aB;
attribute float aEnd;
attribute float aForm;
attribute float aRest;
uniform sampler2D t_simulation;
uniform sampler2D t_look;
uniform sampler2D t_params;
uniform mat3 u_rot;
uniform vec3 u_offset;
uniform float u_progress;
uniform float u_explode;
uniform float u_factor;
uniform float u_lineGain;
uniform float u_drawn; // particles drawn: small screens draw a prefix
varying vec3 vColor;
varying float vAlpha;
varying float vDepth;
${hoverFunctions}
${decodeLook}
float particleIndex(vec2 uv) { return floor(uv.y*${SIDE}.)*${SIDE}.+floor(uv.x*${SIDE}.); }
void main() {
  vec3 a=texture2D(t_simulation,aA).xyz, b=texture2D(t_simulation,aB).xyz;
  vec2 uv=aEnd<.5 ? aA : aB;
  float len=distance(a,b)/max(u_factor,.01);
  float shown=1.-clamp(abs(u_progress-aForm)*1.8,0.,1.);
  shown*=step(max(particleIndex(aA),particleIndex(aB)),u_drawn-.5);
  float fit=1.-smoothstep(aRest*1.35,aRest*2.4,len);
  vec3 world=u_rot*(aEnd<.5 ? a : b)+u_offset;
  float glow;
  world=hover(world,texture2D(t_params,uv),glow);
  vec4 look=texture2D(t_look,uv);
  float emission,alpha;
  decodeLook(look,emission,alpha);
  vColor=mix(look.rgb,vec3(1.),.3+emission*.3);
  vAlpha=shown*fit*(1.-u_explode)*alpha*(.16+emission*.3)*u_lineGain*(1.+glow*1.5);
  vDepth=world.z;
  gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
}
`;

export const lineFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vDepth;
void main() {
  float alpha=vAlpha*smoothstep(-4.5,4.,vDepth);
  if(alpha<.004) discard;
  gl_FragColor=vec4(vColor*alpha,1.);
}
`;
