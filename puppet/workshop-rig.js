import { WORKSHOP_HEAD_OFFSET } from '../v3/workshop-model.js';

// Coordinates are in the supplied 256 x 384 previews (the RGBA source is 4x).
// Each costume has its own arm silhouettes, pivots and safe movement range.
const arm = (shoulder, elbow, wrist, outline) => ({ shoulder, elbow, wrist, outline });
export const BODY_RIGS = Object.freeze({
  '01': { gain: .34, sleeve: true,
    left: arm([94,140],[66,184],[78,204],[[110,140],[82,151],[54,194],[50,243],[42,294],[56,316],[72,312],[84,278],[94,238],[110,222]]),
    right: arm([164,139],[192,184],[174,198],[[150,140],[177,151],[202,195],[208,242],[217,293],[205,316],[186,312],[175,277],[167,236],[150,222]]) },
  '02': { gain: .38, sleeve: false,
    left: arm([100,151],[80,190],[91,205],[[109,142],[78,158],[46,222],[68,266],[107,244],[112,200]]),
    right: arm([155,151],[178,188],[164,206],[[148,145],[174,157],[196,208],[195,255],[163,266],[150,222]]) },
  '03': { gain: .46, sleeve: true,
    left: arm([95,141],[71,187],[96,213],[[113,141],[84,156],[61,207],[42,302],[64,331],[102,310],[115,235]]),
    right: arm([165,143],[182,203],[168,228],[[150,142],[179,158],[198,215],[216,313],[190,337],[159,308],[148,237]]) },
  '04': { gain: .22, sleeve: false,
    left: arm([91,139],[67,211],[108,229],[[111,137],[83,150],[54,213],[64,270],[96,286],[117,235]]),
    right: arm([165,141],[193,194],[191,165],[[149,136],[173,145],[205,167],[214,220],[180,239],[151,208]]),
    prop: { hand: 'right', outline: [[67,265],[193,151],[195,145],[214,130],[229,140],[230,147],[210,164],[205,164],[75,272]], attachments:[[[108,236],[115,239],[104,302],[106,320],[96,342],[82,341],[84,324],[91,308]]] } },
  '05': { gain: .4, sleeve: true,
    left: arm([100,150],[70,190],[98,214],[[111,139],[78,148],[43,198],[38,256],[68,299],[103,306],[116,221]]),
    right: arm([156,150],[188,191],[161,216],[[147,139],[180,148],[216,199],[217,252],[188,301],[155,309],[144,222]]) },
  '06': { gain: .43, sleeve: true,
    left: arm([104,151],[81,192],[107,211],[[112,140],[85,150],[60,193],[40,273],[67,312],[102,304],[114,220]]),
    right: arm([157,150],[180,189],[191,173],[[149,138],[177,149],[201,160],[222,243],[195,299],[166,281],[148,213]]) },
  '07': { gain: .43, sleeve: true,
    left: arm([103,150],[77,202],[53,244],[[111,139],[87,152],[68,185],[41,239],[25,307],[51,332],[84,292],[110,225]]),
    right: arm([159,150],[181,202],[204,246],[[150,140],[177,151],[194,184],[216,238],[233,307],[206,330],[177,292],[149,224]]) },
  '08': { gain: .27, sleeve: false,
    left: arm([93,140],[73,183],[125,198],[[109,139],[83,149],[57,194],[36,254],[73,298],[108,279],[127,225]]),
    right: arm([164,141],[184,171],[157,182],[[147,139],[176,149],[195,183],[215,249],[184,301],[153,276],[144,216]]),
    prop: { hand: 'right', outline: [[121,235],[174,155],[165,147],[163,132],[176,114],[183,105],[205,102],[222,113],[228,139],[223,157],[184,165],[133,242]] } }
});

export const identity = () => [1,0,0,0,1,0,0,0,1];
export const translation = (x,y) => [1,0,0,0,1,0,x,y,1];
export const scaling = (x,y=x) => [x,0,0,0,y,0,0,0,1];
export const rotation = angle => { const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [c,s,0,-s,c,0,0,0,1]; };
export function multiply(a,b) {
  const out = new Array(9);
  for(let column=0;column<3;column++)for(let row=0;row<3;row++)out[column*3+row]=a[row]*b[column*3]+a[3+row]*b[column*3+1]+a[6+row]*b[column*3+2];
  return out;
}
export const around = (point, matrix) => multiply(multiply(translation(...point),matrix),translation(-point[0],-point[1]));
export const transformPoint = (m,p) => [m[0]*p[0]+m[3]*p[1]+m[6],m[1]*p[0]+m[4]*p[1]+m[7]];
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));

export function insidePolygon([x,y],polygon){
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[j],b=polygon[i];
    if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
function segmentDistanceSquared(point,a,b){
  const dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy||1),0,1);
  return (point[0]-a[0]-dx*t)**2+(point[1]-a[1]-dy*t)**2;
}
function outerArm(point,polygon,side){
  const intersections=[];
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[j],b=polygon[i];
    if((a[1]>point[1])!==(b[1]>point[1]))intersections.push(a[0]+(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1]));
  }
  if(!intersections.length)return false;
  return side==='left'?point[0]<Math.max(...intersections):point[0]>Math.min(...intersections);
}
export function classifyPart(point,rig){
  if(rig.prop&&(insidePolygon(point,rig.prop.outline)||rig.prop.attachments?.some(polygon=>insidePolygon(point,polygon))))return 11;
  // The back banners of this costume stay on the torso, behind the arm.
  if(rig===BODY_RIGS['02']&&point[0]>186&&point[1]<195)return 0;
  for(const [side,upper,fore,hand,sleeve]of [['left',2,3,4,8],['right',5,6,7,9]]){
    const part=rig[side],distance=Math.hypot(point[0]-part.wrist[0],point[1]-part.wrist[1]);
    if(distance<11)return hand;
    if(!outerArm(point,part.outline,side))continue;
    if(rig.sleeve&&point[1]>part.wrist[1]+8)return sleeve;
    return segmentDistanceSquared(point,part.shoulder,part.elbow)<segmentDistanceSquared(point,part.elbow,part.wrist)?upper:fore;
  }
  return point[1]>=252?1:0;
}
const regionCache=new Map();
export function buildRegionMask(bodyId){
  if(regionCache.has(bodyId))return regionCache.get(bodyId);
  const rig=BODY_RIGS[bodyId];if(!rig)throw new RangeError('未知的木偶身体');
  const width=512,height=768,pixels=new Uint8Array(width*height*4),counts=new Uint32Array(12);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const part=classifyPart([(x+.5)/2,(y+.5)/2],rig),offset=(y*width+x)*4;
    pixels[offset]=part;pixels[offset+3]=255;counts[part]++;
  }
  const mask={width,height,pixels,counts};regionCache.set(bodyId,mask);return mask;
}

export function poseBones(rig,p,sleeves={left:0,right:0}) {
  const bones=Array.from({length:12},identity);
  bones[1]=around([128,252],rotation(p.skirt*.65));
  for(const [side,upper,forearm,hand,sleeve] of [['left',2,3,4,8],['right',5,6,7,9]]){
    const sign=side==='left'?1:-1,part=rig[side];
    const rawShoulder=p[`${side}Shoulder`]-sign*14,rawElbow=p[`${side}Elbow`]+sign*12;
    // Inward clap uses more elbow; held arms use a bounded outward arc.
    const closing=Math.min(clamp((14-p.leftShoulder)/21,0,1),clamp((p.rightShoulder+14)/21,0,1));
    let shoulder=clamp(rawShoulder*rig.gain,-39,39),elbow=clamp(rawElbow*.68,-35,35);
    if(closing){
      if(rig.prop?.hand===side){shoulder*=1-closing;elbow*=1-closing;}
      else{
        const target=rig.prop?[part.wrist[0]+(rig.right.wrist[0]-part.wrist[0])*.6,part.wrist[1]+(rig.right.wrist[1]-part.wrist[1])*.6]:[side==='left'?126:130,190];
        const [s,e,w]=[part.shoulder,part.elbow,part.wrist],l1=Math.hypot(e[0]-s[0],e[1]-s[1]),l2=Math.hypot(w[0]-e[0],w[1]-e[1]);
        const dx=target[0]-s[0],dy=target[1]-s[1],distance=clamp(Math.hypot(dx,dy),Math.abs(l1-l2)+.1,l1+l2-.1);
        const direction=Math.atan2(dy,dx),spread=Math.acos(clamp((l1*l1+distance*distance-l2*l2)/(2*l1*distance),-1,1));
        const candidates=[direction-spread,direction+spread],angle=candidates.sort((a,b)=>side==='left'?Math.cos(a)-Math.cos(b):Math.cos(b)-Math.cos(a))[0];
        const joint=[s[0]+l1*Math.cos(angle),s[1]+l1*Math.sin(angle)],lower=Math.atan2(target[1]-joint[1],target[0]-joint[0]);
        const originalUpper=Math.atan2(e[1]-s[1],e[0]-s[0]),originalLower=Math.atan2(w[1]-e[1],w[0]-e[0]),degrees=r=>r*180/Math.PI,wrap=d=>((d+540)%360)-180;
        shoulder=wrap(degrees(angle-originalUpper))*closing;
        elbow=wrap(degrees(lower-angle-originalLower+originalUpper))*closing;
      }
    }
    bones[upper]=around(part.shoulder,rotation(shoulder));
    bones[forearm]=multiply(bones[upper],around(part.elbow,rotation(elbow)));
    bones[hand]=bones[forearm];
    bones[sleeve]=multiply(bones[forearm],around(part.wrist,rotation(-shoulder-elbow+sleeves[side]*.5)));
  }
  // Keep the pivot in the collar. The bind offset moves head, ornaments, hair
  // and beard together, and keeps the neck tucked in during nods and tilts.
  bones[10]=multiply(multiply(translation(0,p.nod*3),around([128,116.25],multiply(rotation(clamp(p.head,-13,13)),scaling(1,1-p.nod*.07)))),translation(WORKSHOP_HEAD_OFFSET.x/4,WORKSHOP_HEAD_OFFSET.y/4));
  if(rig.prop)bones[11]=bones[rig.prop.hand==='left'?4:7];
  return bones;
}
