import { normalizeComposition, compositionLayers, compositionSummary } from '../v3/workshop-model.js';
import { BODY_RIGS, buildRegionMask, multiply, translation, rotation, scaling, poseBones } from './workshop-rig.js';

const vertexSource=`
attribute vec2 a_position;
attribute vec2 a_uv;
attribute vec4 a_bones;
attribute vec4 a_weights;
uniform mat3 u_bones[12];
uniform mat3 u_world;
varying vec2 v_uv;
void main(){
  vec3 p=vec3(a_position,1.0);
  vec3 local=(u_bones[int(a_bones.x)]*p)*a_weights.x+(u_bones[int(a_bones.y)]*p)*a_weights.y+(u_bones[int(a_bones.z)]*p)*a_weights.z+(u_bones[int(a_bones.w)]*p)*a_weights.w;
  vec3 screen=u_world*local;
  gl_Position=vec4(screen.x/200.0-1.0,1.0-screen.y/190.0,0.0,1.0);
  v_uv=a_uv;
}`;
const fragmentSource=`
precision highp float;
uniform sampler2D u_image;
uniform sampler2D u_mask;
uniform int u_mode;
uniform int u_part;
uniform vec2 u_joint;
uniform float u_jointRadius;
uniform float u_jointAlpha;
uniform float u_jointFill;
uniform float u_jointSkin;
varying vec2 v_uv;
void main(){
  vec2 p=v_uv*vec2(256.0,384.0);
  int sourcePart=0;
  if(u_mode>=3)sourcePart=int(floor(texture2D(u_mask,v_uv).r*255.0+0.5));
  if(u_mode==4&&sourcePart!=u_part)discard;
  if(u_mode==6){int region=sourcePart;if(u_part==3){if(region!=3&&region!=4&&region!=8)discard;}else{if(region!=6&&region!=7&&region!=9)discard;}}
  if(u_mode==7){int region=sourcePart;if(u_part==2){if(region!=2&&region!=3&&region!=4)discard;}else{if(region!=5&&region!=6&&region!=7)discard;}}
  vec4 color=texture2D(u_image,v_uv);
  if(u_mode==5){
    if(sourcePart==11||((sourcePart==4||sourcePart==7)&&u_jointSkin<0.5))discard;
    float distance=length(p-u_joint);if(distance>u_jointRadius)discard;
    if(color.a<0.7){if(u_jointFill<0.5)discard;color=texture2D(u_image,u_joint/vec2(256.0,384.0));}
    color*=u_jointAlpha*(1.0-smoothstep(u_jointRadius-2.0,u_jointRadius,distance));
  }
  if(u_mode==3){
    float halfWidth=p.y<210.0?mix(40.0,32.0,clamp((p.y-145.0)/65.0,0.0,1.0)):min(94.0,32.0+(p.y-210.0)*0.45);
    if(p.y<145.0||abs(p.x-128.0)>halfWidth||color.a<0.03)discard;
    float originalAlpha=color.a;
    int region=sourcePart;
    if(region>1){
      vec2 cloth=vec2(128.0+(p.x-128.0)*0.35,max(160.0,p.y));
      int candidate=int(floor(texture2D(u_mask,cloth/vec2(256.0,384.0)).r*255.0+0.5));
      if(candidate>1)cloth=vec2(128.0,min(370.0,cloth.y+24.0));
      candidate=int(floor(texture2D(u_mask,cloth/vec2(256.0,384.0)).r*255.0+0.5));
      if(candidate>1)cloth.y=min(370.0,cloth.y+24.0);
      color=texture2D(u_image,cloth/vec2(256.0,384.0));
      color=vec4(color.rgb*originalAlpha/max(color.a,0.01),originalAlpha);
    }
  }
  gl_FragColor=color;
}`;

function shader(gl,type,source){const result=gl.createShader(type);gl.shaderSource(result,source);gl.compileShader(result);if(!gl.getShaderParameter(result,gl.COMPILE_STATUS)){gl.deleteShader(result);throw new Error('当前浏览器暂时无法绘制木偶，请更新浏览器后重试。');}return result;}
const quad = bone => new Float32Array([[0,0],[256,0],[0,384],[256,384]].flatMap(([x,y])=>[x,y,x/256,y/384,bone,0,0,0,1,0,0,0]));

export class WorkshopCharacter {
  constructor(host,composition){
    this.host=host;this.sequence=0;this.disposed=false;this.cache=new Map();this.current=null;this.articulated=true;
    this.canvas=document.createElement('canvas');this.canvas.className='puppet-renderer workshop-puppet-renderer';this.canvas.setAttribute('role','img');
    this.canvas.setAttribute('aria-label','正在加载你的木偶');host.replaceChildren(this.canvas);
    this.onLost=event=>{event.preventDefault();if(this.disposed)return;this.contextLost=true;this.status(false,'绘图已暂停，请重新加载木偶。');};
    this.onRestored=()=>{
      if(this.disposed)return;
      const composition=this.current?.composition||this.composition;
      this.contextLost=false;this.current=null;this.recovering=true;
      try{this.initialize();void this.setComposition(composition).catch(()=>{}).finally(()=>{this.recovering=false;});}
      catch(error){this.recovering=false;this.status(false,error.message);}
    };
    this.canvas.addEventListener('webglcontextlost',this.onLost);this.canvas.addEventListener('webglcontextrestored',this.onRestored);
    try{this.initialize();this.ready=this.setComposition(composition);}catch(error){this.ready=Promise.reject(error);}
    // Consumers await ready; mark it handled even if navigation unmounts immediately.
    this.ready.catch(()=>{});
  }
  initialize(){
    const gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true,preserveDrawingBuffer:true});
    if(!gl)throw new Error('当前浏览器未启用图形加速，请启用后重新加载木偶。');
    this.gl=gl;const vs=shader(gl,gl.VERTEX_SHADER,vertexSource),fs=shader(gl,gl.FRAGMENT_SHADER,fragmentSource),program=gl.createProgram();
    this.anisotropy=gl.getExtension('EXT_texture_filter_anisotropic');
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('木偶绘图初始化失败，请重新加载。');
    this.program=program;gl.useProgram(program);
    this.attributes=['position','uv','bones','weights'].map(name=>gl.getAttribLocation(program,'a_'+name));
    this.uniforms=Object.fromEntries(['bones[0]','world','image','mask','mode','part','joint','jointRadius','jointAlpha','jointFill','jointSkin'].map(name=>[name,gl.getUniformLocation(program,'u_'+name)]));
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.uniform1i(this.uniforms.image,0);
    gl.uniform1i(this.uniforms.mask,1);
    this.quads=Array.from({length:12},(_,bone)=>this.geometry(quad(bone),new Uint16Array([0,1,2,1,3,2])));
    this.resizeObserver?.disconnect();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.canvas);this.resize();
  }
  resize(){
    if(this.disposed)return;const rect=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    const width=Math.max(1,Math.round(rect.width*dpr)),height=Math.max(1,Math.round(rect.height*dpr));
    if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
    const scale=Math.min(width/400,height/380);this.viewport=[(width-400*scale)/2,(height-380*scale)/2,400*scale,380*scale];
    if(this.lastRender)this.render(...this.lastRender);
  }
  geometry(vertices,indices){
    const gl=this.gl,vbo=gl.createBuffer(),ibo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
    return {vbo,ibo,count:indices.length};
  }
  wristRibbon(part,fore,sleeve){
    const [x,y]=part.wrist,joint=y+8,vertices=[];
    for(const [px,py,bone]of [[x-40,joint-2,fore],[x+40,joint-2,fore],[x-40,joint+2,sleeve],[x+40,joint+2,sleeve]])vertices.push(px,py,px/256,py/384,bone,0,0,0,1,0,0,0);
    return this.geometry(new Float32Array(vertices),new Uint16Array([0,1,2,1,3,2]));
  }
  elbowRibbon(part,upper,fore){
    const {shoulder:s,elbow:e,wrist:w}=part,l1=Math.hypot(e[0]-s[0],e[1]-s[1]),l2=Math.hypot(w[0]-e[0],w[1]-e[1]);
    const dx=(e[0]-s[0])/l1+(w[0]-e[0])/l2,dy=(e[1]-s[1])/l1+(w[1]-e[1])/l2,length=Math.hypot(dx,dy)||1,along=[dx/length,dy/length],across=[-dy/length,dx/length],vertices=[];
    for(const [a,b,bone]of [[-36,-3,upper],[36,-3,upper],[-36,3,fore],[36,3,fore]]){const x=e[0]+across[0]*a+along[0]*b,y=e[1]+across[1]*a+along[1]*b;vertices.push(x,y,x/256,y/384,bone,0,0,0,1,0,0,0);}
    return this.geometry(new Float32Array(vertices),new Uint16Array([0,1,2,1,3,2]));
  }
  load(path){
    if(this.cache.has(path)){const value=this.cache.get(path);this.cache.delete(path);this.cache.set(path,value);return value;}
    const promise=new Promise((resolve,reject)=>{
      const image=new Image(),timer=setTimeout(()=>{image.onload=image.onerror=null;reject(new Error('木偶素材加载超时，请重试。'));},12000);
      image.onload=()=>{clearTimeout(timer);if(image.naturalWidth!==1024||image.naturalHeight!==1536){reject(new Error('木偶素材尺寸不匹配。'));return;}resolve(image);};
      image.onerror=()=>{clearTimeout(timer);reject(new Error('木偶素材暂未加载，请重试。'));};image.src=path;
    }).catch(error=>{if(this.cache.get(path)===promise)this.cache.delete(path);throw error;});
    this.cache.set(path,promise);while(this.cache.size>12)this.cache.delete(this.cache.keys().next().value);return promise;
  }
  foreground(back,front){
    // The original hair/beard layers meet at row 443 without overlap. Filtering
    // those separate textures reveals the collar through a one-pixel line.
    // Extend only the foreground silhouette into the matching original hair.
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1536;
    const strip=document.createElement('canvas');strip.width=1024;strip.height=40;
    const context=strip.getContext('2d');context.drawImage(back,0,403,1024,40,0,0,1024,40);
    context.globalCompositeOperation='destination-in';context.drawImage(front,0,443,1024,1,0,0,1024,40);
    const target=canvas.getContext('2d');target.drawImage(strip,0,403);target.drawImage(front,0,0);
    return canvas;
  }
  texture(image,overlay){
    const gl=this.gl,texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
    // Power-of-two backing permits mipmaps on mobile WebGL 1. Keep the source
    // UVs intact; screen placement supplies the original 2:3 aspect ratio.
    const backing=document.createElement('canvas');backing.width=512;backing.height=1024;
    const context=backing.getContext('2d');context.imageSmoothingQuality='high';context.drawImage(image,0,0,512,1024);
    // A complete garment behind the separate collar also closes the rectangular
    // source cutout after mipmap filtering; its foreground order stays intact.
    if(overlay)context.drawImage(overlay,0,0,512,1024);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,backing);gl.generateMipmap(gl.TEXTURE_2D);
    if(this.anisotropy)gl.texParameterf(gl.TEXTURE_2D,this.anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,gl.getParameter(this.anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    return texture;
  }
  maskTexture(mask){
    const gl=this.gl,texture=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,texture);
    for(const name of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,name,gl.NEAREST);
    for(const name of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,name,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,mask.width,mask.height,0,gl.RGBA,gl.UNSIGNED_BYTE,mask.pixels);return texture;
  }
  status(ready,message=''){
    this.rigReady=ready;this.host.dataset.rigStatus=ready?'ready':'load-error';
    this.host.dispatchEvent(new CustomEvent('puppet-rig-status',{detail:{ready,message,articulated:true,restored:!!this.recovering}}));
  }
  async setComposition(value){
    if(this.disposed)return false;const composition=normalizeComposition(value),token=++this.sequence;
    this.composition=composition;this.host.dataset.rigStatus='loading';
    let textures=[],maskTexture,ribbons=[],elbowRibbons=[];
    try{
      const images=await Promise.all(compositionLayers(composition.headId,composition.bodyId).map(path=>this.load(path)));
      if(this.disposed||token!==this.sequence)return false;
      if(this.contextLost)throw new Error('绘图已暂停，请重新加载木偶。');
      const foreground=this.foreground(images[1],images[3]);
      for(const [index,image]of images.entries())textures.push(this.texture(index===3?foreground:image,index===0?images[2]:null));
      if(this.gl.getError()!==this.gl.NO_ERROR)throw new Error('木偶绘图资源暂不可用，请重新加载。');
      const rig=BODY_RIGS[composition.bodyId],mask=buildRegionMask(composition.bodyId);maskTexture=this.maskTexture(mask);
      if(rig.sleeve)ribbons=[this.wristRibbon(rig.left,3,8),this.wristRibbon(rig.right,6,9)];
      elbowRibbons=[this.elbowRibbon(rig.left,2,3),this.elbowRibbon(rig.right,5,6)];
      if(this.disposed||token!==this.sequence){this.release({textures,maskTexture,ribbons,elbowRibbons});return false;}
      this.release(this.current);this.current={composition,rig,textures,mask,maskTexture,ribbons,elbowRibbons};
      this.host.dataset.head=composition.headId;this.host.dataset.body=composition.bodyId;
      if(this.lastRender)this.render(...this.lastRender);
      this.canvas.setAttribute('aria-label',compositionSummary(composition)+'，可操控的木偶');this.status(true);
      return true;
    }catch(error){
      if(textures.length||maskTexture)this.release({textures,maskTexture,ribbons,elbowRibbons});
      if(this.disposed||token!==this.sequence)return false;
      this.status(false,error.message);throw error;
    }
  }
  draw(geometry,texture,mode){
    const gl=this.gl;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(this.uniforms.mode,mode);
    gl.bindBuffer(gl.ARRAY_BUFFER,geometry.vbo);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,geometry.ibo);
    for(const [i,size,offset] of [[0,2,0],[1,2,8],[2,4,16],[3,4,32]]){gl.enableVertexAttribArray(this.attributes[i]);gl.vertexAttribPointer(this.attributes[i],size,gl.FLOAT,false,48,offset);}
    gl.drawElements(gl.TRIANGLES,geometry.count,gl.UNSIGNED_SHORT,0);
  }
  render(p,position,sleeves){
    this.lastRender=[p,position,sleeves];if(this.disposed||this.contextLost||!this.current)return;
    const {gl,current}=this,{rig,textures}=current;
    const x=Math.max(-32,Math.min(32,position.x+p.walk));
    const world=multiply(multiply(multiply(translation(200+x,270+position.y+p.bob),multiply(scaling(p.turn,1),rotation(p.body))),scaling(.8203125)),translation(-128,-263.75));
    gl.useProgram(this.program);gl.viewport(...this.viewport);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix3fv(this.uniforms.world,false,new Float32Array(world));
    const bones=poseBones(rig,p,sleeves);gl.uniformMatrix3fv(this.uniforms['bones[0]'],false,new Float32Array(bones.flat()));
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,current.maskTexture);
    this.draw(this.quads[0],textures[0],3);
    const region=part=>{if(!current.mask.counts[part])return;gl.uniform1i(this.uniforms.part,part);this.draw(this.quads[part],textures[0],4);};
    const joint=(point,parent,child,radius)=>{
      const angle=m=>Math.atan2(m[1],m[0]),alpha=Math.min(1,Math.abs(angle(bones[child])-angle(bones[parent]))/.3);
      if(alpha<.01)return;gl.uniform2fv(this.uniforms.joint,point);gl.uniform1f(this.uniforms.jointRadius,radius);gl.uniform1f(this.uniforms.jointAlpha,alpha);gl.uniform1f(this.uniforms.jointFill,parent===0?0:1);gl.uniform1f(this.uniforms.jointSkin,parent===3||parent===6?1:0);this.draw(this.quads[parent],textures[0],5);
    };
    region(1);region(0);joint(rig.left.shoulder,0,2,18);joint(rig.right.shoulder,0,5,18);
    region(2);region(5);joint(rig.left.elbow,2,3,20);joint(rig.right.elbow,5,6,20);
    for(const [index,ribbon]of current.elbowRibbons.entries()){gl.uniform1i(this.uniforms.part,index?5:2);this.draw(ribbon,textures[0],7);}
    region(8);region(9);
    for(const [index,ribbon]of current.ribbons.entries()){gl.uniform1i(this.uniforms.part,index?6:3);this.draw(ribbon,textures[0],6);}
    region(3);region(6);joint(rig.left.wrist,3,8,20);joint(rig.right.wrist,6,9,20);region(4);region(7);region(11);
    this.draw(this.quads[10],textures[1],0);this.draw(this.quads[0],textures[2],0);this.draw(this.quads[10],textures[3],0);
  }
  release(model){
    if(!model)return;for(const texture of model.textures||[])this.gl.deleteTexture(texture);
    if(model.maskTexture)this.gl.deleteTexture(model.maskTexture);
    for(const ribbon of model.ribbons||[]){this.gl.deleteBuffer(ribbon.vbo);this.gl.deleteBuffer(ribbon.ibo);}
    for(const ribbon of model.elbowRibbons||[]){this.gl.deleteBuffer(ribbon.vbo);this.gl.deleteBuffer(ribbon.ibo);}
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;++this.sequence;this.resizeObserver?.disconnect();this.cache.clear();this.release(this.current);
    this.canvas.removeEventListener('webglcontextlost',this.onLost);this.canvas.removeEventListener('webglcontextrestored',this.onRestored);
    if(this.gl){for(const q of this.quads||[]){this.gl.deleteBuffer(q.vbo);this.gl.deleteBuffer(q.ibo);}this.gl.deleteProgram(this.program);this.gl.getExtension('WEBGL_lose_context')?.loseContext();}
    this.current=null;this.lastRender=null;this.canvas.remove();
  }
}

export const createWorkshopCharacter=(host,composition)=>new WorkshopCharacter(host,composition);
