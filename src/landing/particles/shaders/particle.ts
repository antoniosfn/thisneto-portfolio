import { atlas, constants, rotation, simplex } from "./common";
import { hoverFunctions } from "./hover";
import { decodeLook } from "./simulation";

export const particleVertex = /* glsl */ `
attribute vec2 aSimulationUv;
uniform sampler2D t_simulation;
uniform sampler2D t_look;
uniform sampler2D t_params;
uniform mat3 u_rot;
uniform vec3 u_offset;
uniform float u_time;
uniform float u_clock; // stops while a form is complete
uniform float u_scale;
uniform sampler2D t_motion;
uniform float u_progress;
varying vec3 vColor;
varying float vDepth;
varying float vAlpha;
varying float vEmission;
${constants}
${atlas}
${simplex}
${rotation}
${hoverFunctions}
${decodeLook}
void main() {
  vec2 coord=aSimulationUv;
  vec4 rnd=texture2D(t_params,coord);
  vec3 p=texture2D(t_simulation,coord).xyz;
  vec3 world=u_rot*p+u_offset;
  float glow;
  world=hover(world,rnd,u_time,glow);
  vec4 look=texture2D(t_look,coord);
  float emission,alpha;
  decodeLook(look,emission,alpha);
  float size=(.35+.8*pow(fract(rnd.x*13.37+rnd.y*7.1),3.))*u_scale;
  size*=1.+glow*.55+emission*.22;
  // The closing scene sizes each region: fine strokes for the couple, large
  // triangles for the leaves (motion.w = size ÷ 2).
  float scene=clamp(u_progress-(FINALE-1.),0.,1.);
  if(scene>0.) size*=mix(1.,slot(t_motion,coord,FINALE).w*2.,scene);
  float n=snoise(p*.619);
  vec3 corner=axisAngle(vec3(1,0,1),n)*axisAngle(vec3(0,1,1),mod(n+u_clock,6.283185))*position;
  gl_Position=projectionMatrix*viewMatrix*vec4(billboard(world,corner*size*step(.01,alpha)),1.);
  vColor=look.rgb;
  vEmission=min(1.,emission+glow*.55);
  vDepth=world.z;
  vAlpha=alpha;
}
`;

/**
 * Saturated colour with self-emission: dull particles keep their hue, focal
 * points (nodes, electrons, chakras) burn towards white, as the references'
 * neon bloom. Depth fades the far side of the field.
 */
export const particleFragment = /* glsl */ `
varying vec3 vColor;
varying float vDepth;
varying float vAlpha;
varying float vEmission;
const float COLOR_FACTOR=.84;
const float SATURATION=1.32;
void main() {
  float alpha=smoothstep(-4.5,4.,vDepth)*vAlpha;
  if(alpha<.008) discard;
  vec3 c=vColor;
  c=mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,SATURATION);
  c=max(c,0.)*COLOR_FACTOR*(1.+vEmission*.85);
  c=mix(c,vec3(1.),smoothstep(.7,1.,vEmission)*.4);
  gl_FragColor=vec4(c,alpha);
  #include <colorspace_fragment>
}
`;
