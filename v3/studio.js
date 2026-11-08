import { ACTIONS, PuppetController } from '../puppet/controller.js';
import { bindPuppetInputs } from '../puppet/input.js';
import { createWorkshopCharacter } from '../puppet/character-workshop.js';
import { studioRepository as repository } from './storage.js';
import { activeComposition, savedWorks, compositionImage, compositionSummary, normalizeComposition } from './workshop-model.js';
import { esc } from './core.js';

export const studioData = () => repository.state;
const sleeveIcon='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 8 9 24l7 17 10-7 2-19 8 26 8-8-12-23-3-5Z" fill="currentColor"/><path d="M25 10 20 32M30 13l7 20" fill="none" stroke="#f7efde" stroke-width="2"/></svg>';

export function renderStudio(ctx) {
  const selected=activeComposition(ctx.state),works=savedWorks(ctx.state);
  return `<section class="v3-studio v3-studio-practice" data-v3-studio="practice" data-input-disabled="true">
    <header class="v3-studio-hero v3-practice-hero"><a class="v3-studio-back" href="#/learn" aria-label="返回学艺">←</a><div><h1>操偶<br><span>课堂</span><small>学艺</small></h1><p>一手稳住主杖，一手轻提衣袖。<br>让亲手制作的木偶，在指尖活起来。</p></div></header>
    <section class="studio-work-selection" aria-label="选择操控的木偶"><div class="studio-selection-heading"><div><small>正在操控</small><h2 data-studio-name>${esc(selected.name)}</h2><p data-studio-summary>${esc(compositionSummary(selected))}</p></div><a href="#/learn/workshop">${works.length?'制作新木偶':'去制作工坊'} →</a></div>
      ${works.length?`<div class="studio-work-picker" role="group" aria-label="我的木偶">${works.slice().reverse().map(work=>`<button data-studio-work="${esc(work.id)}" aria-pressed="${work.id===selected.id}" title="${esc(compositionSummary(work))}"><img src="${compositionImage(work)}" alt="" width="48" height="64" loading="lazy"><span>${esc(work.name||'我的木偶')}</span></button>`).join('')}</div>`:'<p class="studio-empty-tip">先用这位木偶练一练，也可以去工坊制作自己的木偶。</p>'}
    </section>
    <div class="v3-live-panel" data-v3-live>
      <div class="v3-live-scene stage-water" data-v3-scene aria-label="可操控木偶舞台"><div class="v3-stage-name">一方戏台 · 万般身段</div>
        <aside class="v3-action-rail" aria-label="动作选择"><h2>动作选择 <span aria-hidden="true">❖</span></h2>${ACTIONS.map((action,i)=>`<button data-puppet-action="${action.id}" aria-label="${action.name}" aria-pressed="false" title="${action.tip} 快捷键 ${i+1}" ${repository.state.practiced.includes(action.id)?'data-completed="true"':''} disabled><span class="studio-motion-number" aria-hidden="true">${['一','二','三','四','五'][i]}</span><span>${action.name}</span><i aria-hidden="true">✓</i></button>`).join('')}</aside>
        <div class="puppet-host v3-puppet-host" id="v3-puppet-host"></div><span class="v3-live-tag"><i></i><span data-v3-puppet-status>待机</span></span><span class="v3-stage-floor" aria-hidden="true"></span>
      </div>
      <p class="v3-studio-notice v3-rig-notice" data-v3-rig-notice role="status" aria-live="polite">正在加载你的木偶…</p><button class="studio-retry" data-studio-retry hidden>重新加载木偶</button>
      <section class="v3-control-panel" aria-label="操作键位"><h2 class="v3-studio-section-title">❖ 操作键位</h2><div class="v3-control-grid"><div class="v3-joystick-column"><div class="joystick v3-joystick" data-joystick role="group" aria-label="连续移动木偶摇杆" inert><span class="v3-joy-up">▲</span><span class="v3-joy-down">▼</span><span class="v3-joy-left">◀</span><span class="v3-joy-right">▶</span><div class="joystick-knob"></div></div><span>移动木偶</span></div><div class="v3-arm-buttons"><button data-hold-arm="left" aria-label="按住抬起左臂" disabled>${sleeveIcon}<span>左臂</span></button><button data-hold-arm="right" aria-label="按住抬起右臂" disabled>${sleeveIcon}<span>右臂</span></button><button data-puppet-action="turn" aria-label="完成转身" disabled><b aria-hidden="true">⟳</b><span>转身</span></button><button data-puppet-action="sleeve" aria-label="完成挥袖" disabled>${sleeveIcon}<span>挥袖</span></button></div></div></section>
      <div class="v3-studio-help"><button data-puppet-reset aria-label="复位木偶位置和关节" disabled>↺ 复位</button><details><summary>操作说明与键盘</summary><p>一手摇杆，一手抬臂；双臂可同时按住。方向键 / WASD 移动，Q / E 抬左 / 右臂，1–5 依次练习动作，R 复位。松手、失焦或触摸取消时停止输入。</p><p>转身为二维舞台表现；不同戏服和手持道具有各自的动作幅度。</p></details></div>
      <div class="studio-practice-progress"><span>已练习 <b data-v3-practice-count>${repository.state.practiced.length}</b> / 5 招</span><a href="#/me/works">我的作品 →</a><progress data-studio-progress max="5" value="${repository.state.practiced.length}"></progress><p>完整演完后计入进度。慢慢来，每一招都有自己的节奏。</p></div>
    </div><p class="v3-storage-status" data-v3-storage-status role="status"></p>
  </section>`;
}

export function mountStudio(root,ctx) {
  const section=root.querySelector('[data-v3-studio]'),host=root.querySelector('#v3-puppet-host');
  if(!section||!host)return ()=>{};
  const $=selector=>section.querySelector(selector);
  let destroyed=false,pending=activeComposition(ctx.state),selected=null,request=0,loading=true,suspended=false;
  const controller=new PuppetController(host,{
    composition:pending,characterFactory:createWorkshopCharacter,
    onStateChange(snapshot){
      if(destroyed)return;$('[data-v3-puppet-status]').textContent=snapshot.status;
      for(const button of section.querySelectorAll('[data-puppet-action]')){const active=snapshot.currentAction===button.dataset.puppetAction;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
    },
    onActionComplete(event){
      if(destroyed||loading||event.source!=='user')return;
      if(!repository.practice(event.id))$('[data-v3-storage-status]').textContent=repository.state.storageError;
      $('[data-v3-practice-count]').textContent=String(repository.state.practiced.length);$('[data-studio-progress]').value=repository.state.practiced.length;
      for(const button of section.querySelectorAll('[data-puppet-action]'))button.dataset.completed=String(repository.state.practiced.includes(button.dataset.puppetAction));
      if(repository.state.practiced.length===ACTIONS.length)ctx.onLesson('practice');
    }
  });
  const inputCleanup=bindPuppetInputs(section,controller);
  const controls=()=>{
    const disabled=loading||suspended||destroyed||!controller.character.rigReady;
    section.dataset.inputDisabled=String(disabled);
    section.querySelectorAll('[data-puppet-action],[data-hold-arm],[data-puppet-reset]').forEach(button=>button.disabled=disabled);
    $('[data-joystick]').inert=disabled;
  };
  function commit(composition){
    selected=composition;const nextId=composition.id||null;
    if(ctx.state.activeWorkId!==nextId){ctx.state.activeWorkId=nextId;ctx.save();}
    $('[data-studio-name]').textContent=composition.name||'我的木偶';$('[data-studio-summary]').textContent=compositionSummary(composition);
    for(const button of section.querySelectorAll('[data-studio-work]'))button.setAttribute('aria-pressed',String(button.dataset.studioWork===composition.id));
  }
  async function choose(composition,initial=false){
    if(destroyed)return;const token=++request;pending=composition;loading=true;inputCleanup.clear();controller.reset({source:'selection'});controls();
    $('[data-v3-rig-notice]').textContent='正在加载你的木偶…';$('[data-studio-retry]').hidden=true;
    try{
      const ready=initial?await controller.character.ready:await controller.setComposition(composition);
      if(destroyed||token!==request||!ready)return;
      commit(composition);loading=false;if(!suspended)controller.resume();$('[data-v3-rig-notice]').textContent='轻提手杖，试着完成一个动作。';controls();
    }catch(error){
      if(destroyed||token!==request)return;loading=false;controls();$('[data-v3-rig-notice]').textContent=error.message;$('[data-studio-retry]').hidden=false;
    }
  }
  const onStatus=event=>{
    if(destroyed)return;
    if(event.detail.restored&&event.detail.ready){++request;loading=false;commit(controller.character.current.composition);controller.reset({source:'restore'});if(!suspended)controller.resume();}
    else if(loading)return;
    if(!event.detail.ready){inputCleanup.clear();controller.pause();controls();$('[data-v3-rig-notice]').textContent=event.detail.message||'木偶加载失败，请重试。';$('[data-studio-retry]').hidden=false;}
    else{if(!suspended)controller.resume();controls();$('[data-v3-rig-notice]').textContent='轻提手杖，试着完成一个动作。';$('[data-studio-retry]').hidden=true;}
  };
  host.addEventListener('puppet-rig-status',onStatus);
  const click=event=>{
    const retry=event.target.closest('[data-studio-retry]');if(retry){void choose(pending||selected);return;}
    const button=event.target.closest('[data-studio-work]');if(!button)return;
    const work=savedWorks(ctx.state).find(work=>work.id===button.dataset.studioWork);if(work)void choose(normalizeComposition(work));
  };
  section.addEventListener('click',click);
  const pause=()=>{if(destroyed)return;suspended=true;inputCleanup.clear();controller.pause();controls();};
  const resume=()=>{if(destroyed||document.hidden||document.querySelector('[role="dialog"]'))return;suspended=false;controller.resume();controls();};
  const visibility=()=>document.hidden?pause():resume();
  for(const event of ['blur','pagehide','muhou-pause'])window.addEventListener(event,pause);
  for(const event of ['focus','pageshow','muhou-resume'])window.addEventListener(event,resume);
  document.addEventListener('visibilitychange',visibility);
  if(document.hidden)pause();
  void choose(pending,true);
  return ()=>{
    if(destroyed)return;destroyed=true;++request;inputCleanup();controller.destroy();section.removeEventListener('click',click);host.removeEventListener('puppet-rig-status',onStatus);
    for(const event of ['blur','pagehide','muhou-pause'])window.removeEventListener(event,pause);
    for(const event of ['focus','pageshow','muhou-resume'])window.removeEventListener(event,resume);
    document.removeEventListener('visibilitychange',visibility);
  };
}
