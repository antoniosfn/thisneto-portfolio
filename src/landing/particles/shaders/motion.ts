/**
 * Per-particle motion of the forms (forms/compose.ts MOTION). It runs inside
 * the simulation's target, so the spring smooths it and the lines of light,
 * which read the simulated positions, move with it.
 */
import { sceneMotion } from "../finale/shaders";

export const motion = /* glsl */ `
uniform vec4 u_book; // xyz centre, w scale, in the field frame
uniform vec4 u_atom;
uniform mat3 u_bookFace; // turns each group to face the camera
uniform mat3 u_atomFace;
uniform float u_page; // 0 → 2: one leaf turned per project
uniform float u_time;

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
float sparkHeight(vec4 m) { return fract(m.y+u_time*.055); }
vec3 spark(vec4 m) {
  float h=sparkHeight(m);
  float r=(.03+.22*h*(.8+.4*m.w))*u_book.w;
  float a=m.z*2.*PI+h*5.+u_time*.35;
  vec3 origin=bookPlace(BOOK_GUTTER);
  return origin+vec3(cos(a)*r+h*h*.22*u_book.w,h*.9*u_book.w,sin(a)*r*.6);
}

// Single file from the cube to the centre, two strands twisted together, then
// one branch to the book (warm) and one to the atom (cool).
vec3 streamPoint(float s,float warm,vec2 lateral) {
  vec3 end=warm>.5 ? u_book.xyz : u_atom.xyz;
  if(s<FORK_AT) {
    float a=s/FORK_AT;
    vec3 p=mix(STREAM_START,vec3(0.),a);
    p.y+=sin(a*PI)*.16;
    float twist=a*14.+warm*PI+u_time*.6;
    p+=vec3(0.,cos(twist),sin(twist))*.03+vec3(lateral,0.)*.006;
    return p;
  }
  float b=(s-FORK_AT)/(1.-FORK_AT);
  vec3 p=mix(vec3(0.),end,b);
  vec3 side=normalize(vec3(-end.y,end.x,0.)+1e-5);
  p+=side*sin(b*PI)*.14*(warm>.5 ? 1. : -1.);
  p+=vec3(lateral,0.)*.008+vec3(0.,sin(u_time*1.4+s*40.)*.004,0.);
  return p;
}

${sceneMotion}

vec3 animate(vec3 p,vec4 m) {
  float type=m.x;
  if(type<.5) return p;
  if(type<M_BOOK+.5) return bookPlace(p);
  if(type<M_PAGE+.5) return bookPlace(turnPage(p,m.y));
  if(type<M_SPARK+.5) return spark(m);
  if(type<M_NUCLEUS+.5) return atomPlace(axisAngle(vec3(.2,1.,.1),u_time*.3)*p);
  if(type<M_ORBIT+.5) return atomPlace(axisAngle(m.yzw,u_time*.12)*p);
  if(type<M_ELECTRON+.5) return atomPlace(axisAngle(m.yzw,u_time*.85)*p);
  if(type<M_STREAM_COOL+.5) return streamPoint(m.y,type<M_STREAM_WARM+.5 ? 1. : 0.,m.zw);
  if(type<M_SEPHIRA+.5) return p;
  if(type<M_LEAF+.5) {
    float ph=m.y*2.*PI;
    return p+vec3(sin(u_time*.7+ph+p.y*3.),cos(u_time*.55+ph*1.3),sin(u_time*.6+ph*.7))*.012;
  }
  if(type<M_HAIR+.5) {
    float s=m.y,ph=m.z*2.*PI;
    return p+vec3(sin(u_time*1.1+ph+s*4.)*m.w*.03,cos(u_time*.9+ph)*.018,sin(u_time*.8+ph))*s;
  }
  if(type<M_CHAKRA+.5) {
    vec3 c=vec3(0.,m.z,m.w);
    return c+axisAngle(vec3(0,1,0),u_time*.6)*(p-c);
  }
  if(type>M_RING+.5) {
    // The closing scene: water, river, smoke, clouds, glow (finale/shaders.ts).
    float alpha,glow;
    return sceneAnimate(p,m,u_time,alpha,glow);
  }
  // RING: about its tilted axis through (0, y, 0).
  vec3 c=vec3(0.,m.y,0.);
  return c+axisAngle(vec3(0.,cos(m.z),sin(m.z)),u_time*.25)*(p-c);
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
