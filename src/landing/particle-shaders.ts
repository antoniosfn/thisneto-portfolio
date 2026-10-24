export const fullscreenVertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv=uv; gl_Position=vec4(position.xy,0.,1.); }
`;

export const atlasFunctions = /* glsl */ `
uniform sampler2D t_position;
uniform sampler2D t_params;
uniform sampler2D t_ranks;
uniform sampler2D t_explosion;
uniform float u_progress;
uniform float u_explode;
uniform float u_factor;
uniform float u_show;
const float L=10000.;
const float GRID=3.;
const int FORMS=6;
// Dala's staggered delay (d·(L−1) = 5): each particle departs by its rank.
const float MORPH_DELAY=.0005;
float stagger(float t,float d,float rank) { return clamp(t*(1.+d*(L-1.))-d*rank,0.,1.); }
vec3 slot(sampler2D atlas,vec2 coord,float k) {
  return texture2D(atlas,(coord+vec2(mod(k,GRID),floor(k/GRID)))/GRID).xyz;
}
// Form k is reached at progress k; each transition uses its own rank channel.
vec3 morph(sampler2D atlas,vec2 coord,vec4 rank) {
  vec3 value=slot(atlas,coord,0.);
  for(int k=1;k<FORMS;k++) {
    float t=clamp(u_progress-float(k-1),0.,1.);
    if(t<=0.) break;
    float r=rank[(k-1)-((k-1)/3)*3];
    value=mix(value,slot(atlas,coord,float(k)),stagger(t,MORPH_DELAY,r));
  }
  return value;
}
vec3 target(vec2 coord) {
  vec4 param=texture2D(t_params,coord), rank=texture2D(t_ranks,coord);
  float show=stagger(u_show,.00015,param.z);
  show=show<.5 ? 16.*pow(show,5.) : 1.-pow(-2.*show+2.,5.)*.5;
  float radius=mix(u_factor+param.x*3.,u_factor,show);
  vec3 p=(morph(t_position,coord,rank)-.5)*2.*radius;
  return mix(p,p*texture2D(t_explosion,coord).x,stagger(u_explode,.00015,rank.w));
}
`;

export const velocityFragment = /* glsl */ `
varying vec2 vUv;
uniform sampler2D t_current;
uniform sampler2D t_velocity;
${atlasFunctions}
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

// 3D simplex noise by Ian McEwan / Ashima Arts and Stefan Gustavson (MIT).
const simplex = /* glsl */ `
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
`;

const rotation = /* glsl */ `
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

export const particleVertex = /* glsl */ `
attribute vec2 aSimulationUv;
uniform sampler2D t_simulation;
uniform sampler2D t_color;
uniform sampler2D t_scale;
uniform vec3 u_offset;
uniform vec3 u_rotation;
uniform vec2 u_mouse;
uniform vec2 u_delta;
uniform vec2 u_resolution;
uniform vec2 u_resolution2;
uniform float u_progress2;
uniform float u_time;
uniform float u_pointer;
uniform float u_scale;
varying vec3 vColor;
varying float vDepth;
varying float vAlpha;
const float CAMERA_Z=10.;
const float COLOR_FACTOR=.8;
${atlasFunctions}
${simplex}
${rotation}
void main() {
  vec2 coord=aSimulationUv;
  vec4 rnd=texture2D(t_params,coord), rank=texture2D(t_ranks,coord);
  vec3 p=texture2D(t_simulation,coord).xyz;
  mat3 rotation=axisAngle(vec3(0,0,1),u_rotation.z)*axisAngle(vec3(0,1,0),u_rotation.y)*axisAngle(vec3(1,0,0),u_rotation.x);
  vec3 world=rotation*p+u_offset;
  vec2 res=mix(u_resolution*.5,u_resolution2*.5,clamp(u_progress2,0.,1.));
  // Cursor and particle compared on the z = 0 plane, in world units.
  vec2 projected=world.xy*CAMERA_Z/max(.1,CAMERA_Z-world.z);
  float radius=1.25+abs(max(u_delta.x,u_delta.y));
  float dist=(1.-smoothstep(0.,radius,distance(projected,u_mouse*res)))*u_pointer;
  float gain=abs(u_explode-1.);
  world.x+=dist*sin(u_time*(.7+rnd.y*2.))*(rnd.x*.35+u_delta.x)*gain;
  world.y+=dist*cos(u_time*(.7+rnd.y*2.))*(rnd.x*.35+u_delta.y)*gain;
  float size=morph(t_scale,coord,rank).x*u_scale;
  size+=dist*.75*gain;
  float n=snoise(p*.619);
  vec3 corner=axisAngle(vec3(1,0,1),n)*axisAngle(vec3(0,1,1),mod(n+u_time,6.283185))*position;
  gl_Position=projectionMatrix*viewMatrix*vec4(billboard(world,corner*size),1.);
  vColor=morph(t_color,coord,rank)*COLOR_FACTOR;
  vColor=mix(vColor,vec3(.45),max(0.,dist-u_explode)*gain);
  vDepth=world.z;
  vAlpha=1.;
}
`;

export const backdropVertex = /* glsl */ `
attribute vec4 aOrigin;
attribute vec4 aTone;
attribute vec4 aAngle;
uniform vec2 u_extent;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_scale;
varying vec3 vColor;
varying float vDepth;
varying float vAlpha;
${rotation}
void main() {
  vec3 world=vec3(aOrigin.xy*u_extent*.5+u_mouse,aOrigin.z);
  vec3 corner=axisAngle(aAngle.xyz,aAngle.w+u_time*.25)*position*u_scale;
  gl_Position=projectionMatrix*viewMatrix*vec4(billboard(world,corner),1.);
  vColor=aTone.rgb;
  vAlpha=aTone.a;
  vDepth=4.;
}
`;

// Flat colour, as Dala's `outgoingLight.rgb = col.rgb`: the pyramid geometry
// carries the shape, depth fades the far side of the field.
export const particleFragment = /* glsl */ `
varying vec3 vColor;
varying float vDepth;
varying float vAlpha;
void main() {
  float alpha=smoothstep(-4.5,4.,vDepth)*vAlpha;
  if(alpha<.008) discard;
  gl_FragColor=vec4(vColor,alpha);
  #include <colorspace_fragment>
}
`;

export const vignetteShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: fullscreenVertex,
  fragmentShader: /* glsl */ `
varying vec2 vUv;
uniform sampler2D tDiffuse;
void main(){
  vec4 color=texture2D(tDiffuse,vUv);
  vec2 uv=(vUv-.5)*.3;
  color.rgb=mix(color.rgb,vec3(1.-4.),dot(uv,uv));
  gl_FragColor=vec4(max(color.rgb,vec3(0.)),1.);
}
`,
};
