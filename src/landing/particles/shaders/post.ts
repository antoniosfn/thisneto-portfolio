import { fullscreenVertex } from "./simulation";

/**
 * Last pass: Dala's corner vignette, then a black floor. Bloom and vignette
 * leave a faint residue over the whole frame; anything under 3/255 becomes
 * exactly 0, so empty background is pixels-off black on OLED screens.
 */
export const finalShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: fullscreenVertex,
  fragmentShader: /* glsl */ `
varying vec2 vUv;
uniform sampler2D tDiffuse;
const float FLOOR=3./255.;
void main(){
  vec4 color=texture2D(tDiffuse,vUv);
  vec2 uv=(vUv-.5)*.3;
  color.rgb=mix(color.rgb,vec3(-3.),dot(uv,uv));
  color.rgb=max(color.rgb-FLOOR,0.)/(1.-FLOOR);
  gl_FragColor=vec4(color.rgb,1.);
}
`,
};
