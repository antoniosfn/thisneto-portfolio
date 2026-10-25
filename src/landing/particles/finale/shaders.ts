import { SCENE } from "./build";
import { SCENE_MOTION } from "./regions";

const float = (v: number) => (Number.isInteger(v) ? `${v}.` : `${v}`);

/**
 * How each region of the closing scene moves, in the field frame. Written to
 * join shaders/motion.ts on the v6 branch: `sceneAnimate` takes a particle's
 * place in the picture and its motion row (type, a, b, c), and also returns
 * an alpha (water, river and smoke fade in and out of their cycles) and a glow
 * multiplier (moon, windows and the couple breathe).
 */
export const sceneMotion = /* glsl */ `
const float S_LEAF=${float(SCENE_MOTION.LEAF)};
const float S_WATER=${float(SCENE_MOTION.WATER)};
const float S_RIVER=${float(SCENE_MOTION.RIVER)};
const float S_SMOKE=${float(SCENE_MOTION.SMOKE)};
const float S_CLOUD=${float(SCENE_MOTION.CLOUD)};
const float S_GLOW=${float(SCENE_MOTION.GLOW)};
const float FALLS_TOP=${float(SCENE.fallsTop)};
const float FALLS_BOTTOM=${float(SCENE.fallsBottom)};
const vec2 CHIMNEY=vec2(${float(SCENE.chimney[0])},${float(SCENE.chimney[1])});

vec3 sceneAnimate(vec3 p,vec4 m,float t,out float alpha,out float glow) {
  float type=m.x;
  alpha=1.;
  glow=1.;
  if(abs(type-S_WATER)<.5) {
    // Each strand keeps its x; water accelerates down it and recycles at the top.
    float h=fract(m.y+t*.2);
    p.y=mix(FALLS_TOP,FALLS_BOTTOM,pow(h,1.35));
    p.x+=sin(t*2.7+m.y*41.)*.002;
    alpha=smoothstep(0.,.06,h)*(1.-smoothstep(.88,1.,h));
  } else if(abs(type-S_RIVER)<.5) {
    // Downstream: towards the bottom left and the viewer.
    float h=fract(m.y+t*.06);
    p+=vec3(-.55,-.22,.3)*(h-.5)*.16;
    alpha=sin(3.14159*h);
  } else if(abs(type-S_SMOKE)<.5) {
    float h=fract(m.y+t*.08);
    p.x=CHIMNEY.x+h*.05+sin(h*6.+m.z*6.28)*.015*h;
    p.y=CHIMNEY.y+h*.24;
    alpha=sin(3.14159*h)*.85;
  } else if(abs(type-S_CLOUD)<.5) {
    p.x+=sin(t*.08+m.y*6.28)*.018;
  } else if(abs(type-S_LEAF)<.5) {
    float ph=m.y*6.28;
    p+=vec3(sin(t*.7+ph+p.y*3.),cos(t*.55+ph*1.3),sin(t*.6+ph))*.006;
  } else if(abs(type-S_GLOW)<.5) {
    glow=.75+.25*sin(t*1.6+m.y*6.28);
  }
  return p;
}
`;
