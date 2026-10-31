import { Euler, Matrix3, Matrix4 } from "three";
import { BOOK, FORM, FORM_COUNT, MOTION, TREE_SEED } from "../forms/catalog";
import { GRID } from "../data";

const float = (v: number) => (Number.isInteger(v) ? `${v}.` : `${v}`);
const vec3 = (v: readonly number[]) => `vec3(${v.map(float).join(",")})`;

function mat3(euler: readonly [number, number, number]) {
  const m = new Matrix3().setFromMatrix4(
    new Matrix4().makeRotationFromEuler(new Euler(...euler)),
  );
  return `mat3(${m.elements.map(float).join(",")})`;
}

/** Constants shared with the form builders (forms/catalog.ts). */
export const constants = /* glsl */ `
const float GRID=${float(GRID)};
const int FORMS=${FORM_COUNT};
// The tree left the atlas; -1 keeps its seed and growth hooks inert.
const int TREE=-1;
const float FINALE=${float(FORM.finale)};
const float PI=3.14159265;
${Object.entries(MOTION)
  .map(([name, value]) => `const float M_${name}=${float(value)};`)
  .join("\n")}
const mat3 BOOK_TILT=${mat3(BOOK.tilt)};
const vec3 BOOK_GUTTER=${vec3(BOOK.gutter)};
const float BOOK_WIDTH=${float(BOOK.width)};
const float BOOK_OPEN=${float(BOOK.open)};
const vec3 TREE_SEED=${vec3(TREE_SEED)};
`;

// 3D simplex noise by Ian McEwan / Ashima Arts and Stefan Gustavson (MIT).
export const simplex = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+10.)*x);}
vec4 invSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy)),x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz),l=1.-g,i1=min(g.xyz,l.zxy),i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx,x2=x0-i2+C.yyy,x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=1./7.; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z),x_=floor(j*ns.z),y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy,y=y_*ns.x+ns.yyyy,h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy),b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.,s1=floor(b1)*2.+1.,sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy,a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x),p1=vec3(a0.zw,h.y),p2=vec3(a1.xy,h.z),p3=vec3(a1.zw,h.w);
  vec4 norm=invSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m*=m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
// Divergence-free flow: fragments travel in currents instead of jittering.
// Potential ψ = (n(p), n(p+a), n(p+b)); returns ∇ × ψ.
vec3 curl(vec3 p){
  const float e=.12;
  const vec3 a=vec3(0.,31.4,0.),b=vec3(17.1,0.,57.3);
  const vec3 dx=vec3(e,0.,0.),dy=vec3(0.,e,0.),dz=vec3(0.,0.,e);
  float xdy=snoise(p+dy)-snoise(p-dy), xdz=snoise(p+dz)-snoise(p-dz);
  float ydx=snoise(p+a+dx)-snoise(p+a-dx), ydz=snoise(p+a+dz)-snoise(p+a-dz);
  float zdx=snoise(p+b+dx)-snoise(p+b-dx), zdy=snoise(p+b+dy)-snoise(p+b-dy);
  return vec3(zdy-ydz,xdz-zdx,ydx-xdy)/(2.*e);
}
`;

export const rotation = /* glsl */ `
mat3 axisAngle(vec3 axis,float a) {
  axis=normalize(axis);float c=cos(a),s=sin(a),t=1.-c;
  return mat3(t*axis.x*axis.x+c,t*axis.x*axis.y+s*axis.z,t*axis.x*axis.z-s*axis.y,
    t*axis.x*axis.y-s*axis.z,t*axis.y*axis.y+c,t*axis.y*axis.z+s*axis.x,
    t*axis.x*axis.z+s*axis.y,t*axis.y*axis.z-s*axis.x,t*axis.z*axis.z+c);
}
// Orient a quad toward the camera after spinning it in 3D.
vec3 billboard(vec3 world,vec3 corner) {
  vec3 forward=normalize(cameraPosition-world);
  vec3 right=normalize(cross(vec3(0,1,0),forward));
  vec3 up=cross(forward,right);
  return world+right*corner.x+up*corner.y+forward*corner.z;
}
`;

/** Read slot k of a GRID × GRID atlas. */
export const atlas = /* glsl */ `
vec4 slot(sampler2D atlas,vec2 coord,float k) {
  return texture2D(atlas,(coord+vec2(mod(k,GRID),floor(k/GRID)))/GRID);
}
// Dala's staggered delay: each particle departs by its rank r in [0, 1]; rank
// r is in flight for t ∈ [d·r/(1+d), (1+d·r)/(1+d)], so with d = 5 the last
// particle leaves at 5/6 and every rank has arrived at t = 1.
const float MORPH_DELAY=5.;
float stagger(float t,float d,float r) { return clamp(t*(1.+d)-d*r,0.,1.); }
`;
