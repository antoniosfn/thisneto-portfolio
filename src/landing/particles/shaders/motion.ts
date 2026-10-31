/**
 * Per-particle motion of the forms (forms/compose.ts MOTION). It runs inside
 * the simulation's target, so the spring smooths it and the lines of light,
 * which read the simulated positions, move with it.
 */
import { sceneMotion } from "../finale/shaders";
import { CUBE_SCRAMBLE } from "../forms/catalog";

const AXES = ["vec3(1,0,0)", "vec3(0,1,0)", "vec3(0,0,1)"];
const COMPONENT = ["x", "y", "z"];
/**
 * The scramble, unrolled: move i turns its layer by a_i of its angle, where
 * a_i = clamp(n·(1 − u_solve) − i, 0, 1), so solving undoes the last move
 * first and only one layer is ever mid-turn. Whole turns snap the cell back
 * onto the grid.
 */
const scramble = CUBE_SCRAMBLE.map(
  ([axis, layer, turns], i) => /* glsl */ `
  a=clamp(n-${i}.,0.,1.);
  if(a>0.&&abs(g.${COMPONENT[axis]}-(${layer}.))<.5) {
    r=axisAngle(${AXES[axis]},${(turns * Math.PI) / 2}*a);
    p=r*p; g=r*g;
    if(a>=1.) g=floor(g+.5);
  }`,
).join("");

export const motion = /* glsl */ `
uniform vec4 u_book; // xyz centre, w scale, in the field frame
uniform vec4 u_atom;
uniform mat3 u_bookFace; // turns each group to face the camera
uniform mat3 u_atomFace;
uniform float u_page; // 0 → 2: one leaf turned per project
// Continuous clock for movement along each element's own path.
uniform float u_clock;
// The puzzle: 0 fully scrambled, 1 solved.
uniform float u_solve;

vec3 bookPlace(vec3 p) { return u_bookFace*BOOK_TILT*p*u_book.w+u_book.xyz; }
vec3 atomPlace(vec3 p) { return u_atomFace*p*u_atom.w+u_atom.xyz; }

// Leaf j turns about the spine from the right block to the left; the fore-edge
// lags behind the spine, so the leaf curls mid-turn.
vec3 turnPage(vec3 p,float j) {
  float t=smoothstep(0.,1.,clamp(u_page-j,0.,1.));
  float u=clamp(abs(p.x)/BOOK_WIDTH,0.,1.);
  float angle=(PI-2.*BOOK_OPEN)*t*(1.-.35*sin(PI*t)*u);
  return axisAngle(vec3(0,0,1),angle)*p;
}

// Height of a spark in its rising cycle, in [0, 1).
float sparkHeight(vec4 m) { return fract(m.y+u_clock*.055); }
vec3 spark(vec4 m) {
  float h=sparkHeight(m);
  float r=(.03+.22*h*(.8+.4*m.w))*u_book.w;
  float a=m.z*2.*PI+h*5.+u_clock*.35;
  vec3 origin=bookPlace(BOOK_GUTTER);
  return origin+vec3(cos(a)*r+h*h*.22*u_book.w,h*.9*u_book.w,sin(a)*r*.6);
}

${sceneMotion}

vec3 cubie(vec3 p,vec3 g) {
  float n=${CUBE_SCRAMBLE.length}.*(1.-u_solve), a;
  mat3 r;${scramble}
  return p;
}

vec3 animate(vec3 p,vec4 m) {
  float type=m.x;
  if(type<.5) return p;
  if(type<M_BOOK+.5) return bookPlace(p);
  if(type<M_PAGE+.5) return bookPlace(turnPage(p,m.y));
  if(type<M_SPARK+.5) return spark(m);
  if(type<M_NUCLEUS+.5) return atomPlace(p);
  if(type<M_ORBIT+.5) return atomPlace(p);
  if(type<M_ELECTRON+.5) return atomPlace(axisAngle(m.yzw,u_clock*.85)*p);
  if(type<M_SEPHIRA+.5) return p;
  if(type<M_LEAF+.5) return p;
  if(type<M_HAIR+.5) return p;
  if(type<M_CHAKRA+.5) {
    vec3 c=vec3(0.,m.z,m.w);
    return c+axisAngle(vec3(0,1,0),u_clock*.6)*(p-c);
  }
  if(abs(type-M_CUBIE)<.5) return cubie(p,m.yzw);
  if(abs(type-M_SPIN)<.5) return axisAngle(normalize(m.yzw),u_clock*length(m.yzw))*p;
  if(type>M_RING+.5) {
    // The closing scene: water, river, smoke, clouds, glow (finale/shaders.ts).
    float alpha,glow;
    return sceneAnimate(p,m,u_clock,alpha,glow);
  }
  // RING: about its tilted axis through (0, y, 0).
  vec3 c=vec3(0.,m.y,0.);
  return c+axisAngle(vec3(0.,cos(m.z),sin(m.z)),u_clock*.25)*(p-c);
}

// Before the tree, everything gathers in the seed: a dense, bright core.
vec3 seedPoint(vec4 rnd) {
  vec3 d=vec3(rnd.x-.5,rnd.y-.5,fract(rnd.x*7.13+rnd.y*3.1)-.5);
  return TREE_SEED+d*.035;
}

// Particles leaving the seed spiral out like galaxy arms, flat at first,
// and settle into the tree as they arrive.
vec3 growSwirl(vec3 p,float st) {
  float open=1.-st;
  vec3 d=p-TREE_SEED;
  d=axisAngle(vec3(0,1,0),open*open*5.5)*d;
  d.xz*=1.+open*.9;
  d.y*=mix(1.,.22,open);
  return TREE_SEED+d;
}
`;
