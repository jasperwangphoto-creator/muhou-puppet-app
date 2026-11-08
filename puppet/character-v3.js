/* Articulated source PNG renderer. AI pixels repair only hidden connections. */
const SVG_NS = 'http://www.w3.org/2000/svg';
const assetRoot = new URL('../assets/v3-art/', import.meta.url);
let sequence = 0;
const names = ['skirt','torso','left-sleeve','right-sleeve','left-upper-arm','right-upper-arm','head'];
const assetUrl = filename => new URL(filename, assetRoot).href;
function element(tag, attrs = {}) { const node = document.createElementNS(SVG_NS, tag); for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,String(value)); return node; }
function imageNode(filename, rect) { const [x,y,width,height] = rect; return element('image',{href:assetUrl(filename),x,y,width,height,preserveAspectRatio:'none'}); }
const selectedCharacter = value => value && typeof value === 'object' ? Math.max(0,Math.min(7,Number(value.characterId ?? 2))) : Number(value)===125?5:Number(value)===280?6:2;
const vectorRotate = (vector, angle) => { const r=angle*Math.PI/180; return {x:vector.x*Math.cos(r)-vector.y*Math.sin(r),y:vector.x*Math.sin(r)+vector.y*Math.cos(r)}; };
async function preload(filename) { return new Promise((resolve,reject)=>{ const img=new Image();img.onload=resolve;img.onerror=()=>reject(new Error(`木偶分层素材加载失败：${filename}`));img.src=assetUrl(filename); }); }
function rigUsable(rig,id) { const available=new Set(rig.parts?.filter(part=>part.file).map(part=>part.name)); return ['candidate','ready'].includes(rig.status)&&rig.characterId===id&&['head','torso','skirt','left-upper-arm','right-upper-arm','left-forearm','right-forearm','left-sleeve','right-sleeve'].every(name=>available.has(name)); }

export function createCharacter(host,variant=0) {
  const characterId=selectedCharacter(variant),token=++sequence;
  host.__v3CharacterToken=token;host.dataset.rigStatus='loading';host.dataset.characterId=String(characterId);
  const svg=element('svg',{class:'puppet-renderer puppet-renderer-v3',viewBox:'0 0 400 380',role:'img','aria-label':'原始木偶；正在加载分层素材',xmlns:SVG_NS});
  const shadow=element('ellipse',{'data-part':'shadow',cx:200,cy:354,rx:61,ry:8,fill:'#3f3a2a',opacity:.15});
  const neutral=element('g',{'data-static-reference':'true'}),neutralImage=imageNode(`puppet-${characterId}.png`,[118.75,43,162.5,301]);
  neutralImage.setAttribute('preserveAspectRatio','xMidYMid meet');neutral.append(neutralImage);
  const character=element('g',{'data-part':'character',transform:'translate(200 270)'}),parts={shadow,character},holders={};
  for(const name of names){const group=element('g',{'data-part':name}),holder=element('g',{'data-part-images':name});group.append(holder);holders[name]=holder;character.append(group);parts[name]=group;}
  for(const side of ['left','right']){const forearm=element('g',{'data-part':`${side}-forearm`}),hand=element('g',{'data-part':`${side}-hand`});holders[`${side}-forearm`]=element('g',{'data-part-images':`${side}-forearm`});holders[`${side}-hand`]=element('g',{'data-part-images':`${side}-hand`});hand.append(holders[`${side}-hand`]);forearm.append(holders[`${side}-forearm`],hand);parts[`${side}-upper-arm`].append(forearm);parts[`${side}-forearm`]=forearm;parts[`${side}-hand`]=hand;}
  parts.rod=element('g',{'data-part':'rod'});character.append(parts.rod);svg.append(shadow,neutral,character);host.replaceChildren(svg);
  const model={enabled:false,landmarks:null,angles:{left:{shoulder:0,elbow:0},right:{shoulder:0,elbow:0}}};
  const result={svg,parts,color:variant,characterId,rig:null,rigReady:false,articulated:false,ready:null};
  // Retarget existing controller angles to measured source shoulder, elbow, wrist and neck.
  const hook=(name,transform)=>{const group=parts[name],original=group.setAttribute.bind(group);group.setAttribute=(key,value)=>{if(key==='transform'){group.__lastControllerTransform=value;original(key,model.enabled?transform(String(value)):value);}else original(key,value);};};
  for(const side of ['left','right']){
    hook(`${side}-upper-arm`,value=>{const angle=Number(value.match(/rotate\(([-.\d]+)/)?.[1]||0),rest=side==='left'?14:-14;model.angles[side].shoulder=angle-rest;const p=model.landmarks[side].shoulder;return `translate(${p.x} ${p.y}) rotate(${angle-rest})`;});
    hook(`${side}-forearm`,value=>{const angle=Number(value.match(/rotate\(([-.\d]+)/)?.[1]||0),rest=side==='left'?-12:12,bend=Math.max(-48,Math.min(48,model.angles[side].shoulder*.55));
      const closing=Math.min(1,Math.max(0,(side==='left'?rest-angle:angle-rest)/20))*Math.min(1,Math.max(0,(side==='left'?-1:1)*model.angles[side].shoulder/21));
      const delta=angle-rest-bend+closing*(side==='left'?85:15);model.angles[side].elbow=delta;const p=model.landmarks[side];return `translate(${p.elbow.x-p.shoulder.x} ${p.elbow.y-p.shoulder.y}) rotate(${delta})`;});
    hook(`${side}-sleeve`,value=>{const p=model.landmarks[side],a=model.angles[side],upper=vectorRotate({x:p.elbow.x-p.shoulder.x,y:p.elbow.y-p.shoulder.y},a.shoulder),lower=vectorRotate({x:p.wrist.x-p.elbow.x,y:p.wrist.y-p.elbow.y},a.shoulder+a.elbow),lag=Number(value.match(/rotate\(([-.\d]+)/)?.[1]||0);return `translate(${p.shoulder.x+upper.x+lower.x} ${p.shoulder.y+upper.y+lower.y}) rotate(${lag})`;});
  }
  hook('head',value=>{const y=Number(value.match(/translate\(0 ([-.\d]+)/)?.[1]||-148),angle=Number(value.match(/rotate\(([-.\d]+)/)?.[1]||0),sy=Number(value.match(/scale\(1 ([-.\d]+)/)?.[1]||1),p=model.landmarks.neck;return `translate(${p.x} ${p.y+y+148}) rotate(${angle}) scale(1 ${sy})`;});
  hook('skirt',value=>{const angle=Number(value.match(/rotate\(([-.\d]+)/)?.[1]||0),p=model.landmarks.hip;return `rotate(${angle} ${p.x} ${p.y})`;});
  result.ready=(async()=>{
    const response=await fetch(assetUrl('rig.json'),{cache:'no-cache'});if(!response.ok)throw new Error(`木偶绑定配置加载失败：${response.status}`);const rig=await response.json();if(host.__v3CharacterToken!==token)return false;result.rig=rig;
    if(!rigUsable(rig,characterId)){host.dataset.rigStatus='awaiting-repair';svg.setAttribute('aria-label','原始木偶静态预览；这个角色尚无分层动作素材');host.dispatchEvent(new CustomEvent('puppet-rig-status',{detail:{ready:false,characterId,reason:'awaiting-repair'}}));return false;}
    await Promise.all(rig.parts.map(part=>preload(part.file)));if(host.__v3CharacterToken!==token)return false;
    const canvas=rig.canvas,placement=rig.placement,sx=placement.width/canvas.width,sy=placement.height/canvas.height;
    const point=([x,y])=>({x:placement.x+x*sx,y:placement.y+y*sy});
    model.landmarks={neck:point(rig.landmarks.neck),hip:point(rig.landmarks.hip)};
    for(const side of ['left','right'])model.landmarks[side]=Object.fromEntries(Object.entries(rig.landmarks[side]).map(([name,p])=>[name,point(p)]));
    const anchor=name=>name==='head'?model.landmarks.neck:name.endsWith('-sleeve')?model.landmarks[name.split('-')[0]].wrist:name.endsWith('-upper-arm')?model.landmarks[name.split('-')[0]].shoulder:name.endsWith('-forearm')||name.endsWith('-hand')?model.landmarks[name.split('-')[0]].elbow:{x:0,y:0};
    for(const part of [...rig.parts].sort((a,b)=>(a.order||0)-(b.order||0))){if(!holders[part.name])continue;const rect=part.sourceRect||[0,0,canvas.width,canvas.height],p=anchor(part.name),wrapper=element('g',{transform:`translate(${-p.x} ${-p.y})`,'data-source-layer':part.name,'data-layer-origin':part.origin||'source'});wrapper.append(imageNode(part.file,[placement.x+rect[0]*sx,placement.y+rect[1]*sy,rect[2]*sx,rect[3]*sy]));holders[part.name].append(wrapper);}
    model.enabled=true;
    for(const name of ['left-upper-arm','right-upper-arm','left-forearm','right-forearm','left-sleeve','right-sleeve','head','skirt'])if(parts[name].__lastControllerTransform)parts[name].setAttribute('transform',parts[name].__lastControllerTransform);
    neutral.remove();result.articulated=true;result.rigReady=rig.status==='ready'&&rig.acceptance?.staticPose===true&&rig.acceptance?.motionJoints===true;
    host.dataset.rigStatus=result.rigReady?'ready':'candidate-unaccepted';svg.setAttribute('aria-label',result.rigReady?'可分部位操控的原始花旦木偶':'原图分层动作预览；关节接缝尚待验收');
    host.dispatchEvent(new CustomEvent('puppet-rig-status',{detail:{ready:result.rigReady,articulated:true,characterId,reason:result.rigReady?'accepted':'candidate-unaccepted'}}));return result.rigReady;
  })().catch(error=>{if(host.__v3CharacterToken===token){host.dataset.rigStatus='load-error';svg.setAttribute('aria-label','原始木偶静态预览；分层素材加载失败');host.dispatchEvent(new CustomEvent('puppet-rig-status',{detail:{ready:false,characterId,reason:'load-error',message:error.message}}));}return false;});
  return result;
}
