import { atlas, constants, rotation, simplex } from "./common";
import { motion } from "./motion";

export const fullscreenVertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv=uv; gl_Position=vec4(position.xy,0.,1.); }
`;

/** Shared by the target (positions) and the look (colours) passes. */
const morphing = /* glsl */ `
${constants}
${rotation}
${atlas}
uniform sampler2D t_position; // atlas: xyz, arrival rank
uniform sampler2D t_motion; // atlas: type, a, b, c
uniform sampler2D t_params;
uniform sampler2D t_ranks;
uniform float u_progress;
uniform float u_seed;
${motion}

vec3 formPoint(vec2 coord,float k,out float rank) {
  vec4 s=slot(t_position,coord,k);
  rank=s.w;
  return animate(s.xyz,slot(t_motion,coord,k));
}

// Form k is reached at progress k; each particle departs by its own rank in
// that form, so lines draw in order and the tree grows from its seed.
vec3 morphTarget(vec2 coord,vec4 rnd,out float flow) {
  float rank;
  vec3 value=formPoint(coord,0.,rank);
  flow=0.;
  for(int k=1;k<FORMS;k++) {
    float t=clamp(u_progress-float(k-1),0.,1.);
    if(k==TREE) value=mix(value,seedPoint(rnd),u_seed);
    if(t<=0.) break;
    vec3 next=formPoint(coord,float(k),rank);
    float st=stagger(t,MORPH_DELAY,rank);
    if(k==TREE) next=growSwirl(next,st);
    value=mix(value,next,st);
    flow=max(flow,st*(1.-st)*4.);
  }
  return value;
}
`;

export const targetFunctions = /* glsl */ `
${simplex}
${morphing}
uniform sampler2D t_explosion;
uniform float u_explode;
uniform float u_explodeMix; // 0 radial burst, 1 rain downwards
uniform float u_factor;
uniform float u_show;
const float EXPLODE_DELAY=1.5;
const float FLOW=.85;
vec3 target(vec2 coord) {
  vec4 param=texture2D(t_params,coord), rank=texture2D(t_ranks,coord);
  float show=stagger(u_show,1.5,param.z);
  show=show<.5 ? 16.*pow(show,5.) : 1.-pow(-2.*show+2.,5.)*.5;
  float radius=mix(u_factor+param.x*3.,u_factor,show);
  float flow;
  vec3 p=morphTarget(coord,param,flow)*radius;
  float e=stagger(u_explode,EXPLODE_DELAY,rank.x);
  vec3 radial=p*texture2D(t_explosion,coord).x;
  vec3 rain=p+vec3((param.x-.5)*2.4,-(.6+param.y*2.2),(rank.y-.5)*1.6)*radius*.35;
  p=mix(p,mix(radial,rain,u_explodeMix),e);
  // Fragments never wander: while in flight or dispersed they ride a slow
  // current, so the move to the next form reads as one organised flow.
  float drift=flow+e*(1.-e)*2.4+e*.3;
  if(drift>.002) p+=curl(p*.16+vec3(0.,u_time*.05,0.))*drift*FLOW;
  // Vacuum: a slow, involuntary float of every particle.
  vec3 ph=vec3(param.x,param.y,rank.z)*6.2832;
  p+=vec3(sin(u_time*.47+ph.x),cos(u_time*.39+ph.y),sin(u_time*.33+ph.z))*.018;
  return p;
}
`;

export const velocityFragment = /* glsl */ `
varying vec2 vUv;
uniform sampler2D t_current;
uniform sampler2D t_velocity;
${targetFunctions}
void main() {
  vec3 p=texture2D(t_current,vUv).xyz;
  vec3 v=texture2D(t_velocity,vUv).xyz;
  float k=.006+texture2D(t_params,vUv).w;
  gl_FragColor=vec4((v+(target(vUv)-p)*k)*.892,1.);
}
`;

export const positionFragment = /* glsl */ `
varying vec2 vUv;
uniform sampler2D t_current;
uniform sampler2D t_velocity;
void main() { gl_FragColor=vec4(texture2D(t_current,vUv).xyz+texture2D(t_velocity,vUv).xyz,1.); }
`;

export const copyFragment = /* glsl */ `
varying vec2 vUv;
uniform sampler2D t_source;
void main() { gl_FragColor=texture2D(t_source,vUv); }
`;

/**
 * Look pass: each particle's colour and emission for the current progress,
 * morphed with the same ranks as its position. Particles and lines read it.
 */
export const decodeLook = /* glsl */ `
// .a = emission in [0, 1] + 2 × round(alpha × 100)
void decodeLook(vec4 look,out float emission,out float alpha) {
  float packed=floor(look.a*.5);
  emission=look.a-2.*packed;
  alpha=packed/100.;
}
`;

export const lookFragment = /* glsl */ `
varying vec2 vUv;
uniform sampler2D t_color; // atlas: rgb, emission
${morphing}
void main() {
  vec4 rnd=texture2D(t_params,vUv);
  vec4 look=slot(t_color,vUv,0.);
  float kNear=clamp(floor(u_progress+.5),0.,float(FORMS-1));
  vec4 m=slot(t_motion,vUv,kNear);
  float treeArrival=0.;
  for(int k=1;k<FORMS;k++) {
    float t=clamp(u_progress-float(k-1),0.,1.);
    if(t<=0.) break;
    float st=stagger(t,MORPH_DELAY,slot(t_position,vUv,float(k)).w);
    if(k==TREE) treeArrival=st;
    look=mix(look,slot(t_color,vUv,float(k)),st);
  }
  float near=1.-smoothstep(.25,.5,abs(u_progress-kNear));
  float type=m.x, alpha=1.;
  // Sefirot, chakras and electrons breathe.
  if(abs(type-M_SEPHIRA)<.5||abs(type-M_CHAKRA)<.5||abs(type-M_ELECTRON)<.5)
    look.a*=mix(1.,.62+.38*sin(u_time*2.2+rnd.y*6.2832+m.y*4.),near);
  // Sparks fade in as they leave the book and out before they recycle.
  if(abs(type-M_SPARK)<.5) {
    float h=sparkHeight(m);
    alpha=mix(1.,smoothstep(0.,.08,h)*(1.-smoothstep(.7,.92,h)),near);
  }
  // Until it leaves, a particle in the seed burns white.
  float seedGlow=u_seed*(1.-treeArrival);
  look.rgb=mix(look.rgb,vec3(1.,.92,.8),seedGlow*.35);
  look.a=max(look.a,seedGlow*.6);
  // Float target: alpha rides in the integer part of .a (see decodeLook).
  gl_FragColor=vec4(look.rgb,min(look.a,1.)+2.*floor(alpha*100.+.5));
}
`;
