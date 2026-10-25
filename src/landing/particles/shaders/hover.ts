/**
 * Hover that belongs to the figure, not to the cursor. The pointer is a ray in
 * 3D; a probe pass finds the depth of the nearest particle on that ray (the
 * figure's front surface under the cursor), and only the layer at that depth
 * reacts: it opens into a crater along the ray and swirls, revealing the
 * volume behind it. Where the ray misses the figure, nothing moves.
 */
export const HOVER = {
  radius: 0.95, // world units around the ray
  core: 0.32, // probe: particles this close to the ray define the surface
  depth: 0.75, // how far behind the front surface the reaction reaches
  far: 1e4, // probe value when the ray misses
} as const;

export const hoverFunctions = /* glsl */ `
uniform vec3 u_rayOrigin;
uniform vec3 u_rayDir;
uniform sampler2D t_hit; // 1×1: depth of the front surface along the ray
uniform float u_pointer;
uniform vec2 u_delta;
uniform float u_hoverGain; // the shader's hover multiplier: |explode − 1|
const float HOVER_RADIUS=${HOVER.radius};
const float HOVER_DEPTH=${HOVER.depth};

vec3 hover(vec3 world,vec4 rnd,float time,out float glow) {
  glow=0.;
  float front=texture2D(t_hit,vec2(.5)).x;
  if(u_pointer<.5||front>${HOVER.far / 2}.) return world;
  vec3 rel=world-u_rayOrigin;
  float t=dot(rel,u_rayDir);
  vec3 perp=rel-u_rayDir*t;
  float dist=length(perp);
  // Dala's speed term widens the reach while the pointer moves.
  // Pointer speed as the larger axis step, whatever the direction.
  float radius=HOVER_RADIUS*(1.+min(max(abs(u_delta.x),abs(u_delta.y)),2.)*.35);
  float reach=1.-smoothstep(0.,radius,dist);
  float depth=exp(-max(0.,t-front)/HOVER_DEPTH);
  float w=reach*depth*u_hoverGain;
  if(w<.001) return world;
  vec3 out_=perp/max(dist,1e-4);
  vec3 swirl=cross(u_rayDir,out_);
  world+=out_*w*(.42+rnd.x*.3)+u_rayDir*w*(.35+rnd.y*.35)
    +swirl*w*sin(time*(.7+rnd.y*2.))*.25;
  glow=w;
  return world;
}
`;

/** Probe: every particle near the ray writes its depth; MIN blending keeps the nearest. */
export const probeVertex = /* glsl */ `
attribute vec2 aSimulationUv;
uniform sampler2D t_simulation;
uniform sampler2D t_look;
uniform mat3 u_rot;
uniform vec3 u_offset;
uniform vec3 u_rayOrigin;
uniform vec3 u_rayDir;
varying float vDepth;
void main() {
  vec3 world=u_rot*texture2D(t_simulation,aSimulationUv).xyz+u_offset;
  vec3 rel=world-u_rayOrigin;
  float t=dot(rel,u_rayDir);
  // Invisible particles (sparks between cycles) are not surface: look.a ≥ 2
  // means alpha > 0 (see decodeLook).
  bool visible=texture2D(t_look,aSimulationUv).a>=2.;
  vDepth=visible&&length(rel-u_rayDir*t)<${HOVER.core} ? t : ${HOVER.far}.;
  gl_Position=vec4(0.,0.,0.,1.);
  gl_PointSize=1.;
}
`;

export const probeFragment = /* glsl */ `
varying float vDepth;
void main() { gl_FragColor=vec4(vDepth,0.,0.,1.); }
`;
