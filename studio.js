import { ACTIONS, PuppetController } from './puppet/controller.js';
import { bindPuppetInputs } from './puppet/input.js';

const KEY = 'muhou-studio-v2';
const newId = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const fresh = () => ({ practiced: [], challenges: [], recordings: [], stage: 'water', play: '踏雪寻梅' });
let memory;
try { memory = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
catch { memory = fresh(); }
for (const k of ['practiced','challenges','recordings']) if (!Array.isArray(memory[k])) memory[k] = [];
let storageNotice = false;
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { storageNotice = true; } };
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const studioData = () => memory;
let replayId = null;
export const selectRecording = id => { replayId = id; };
const stages = [['water','水乡戏台'],['city','古城戏台'],['plum','花间小台']];
const plays = ['踏雪寻梅','水袖轻舞','武生亮相'];
const actionGlyph = {nod:'颔',clap:'合',turn:'回',sleeve:'袖',walk:'步'};

export function renderStudio(mode = 'practice') {
  const challenge = mode === 'challenge', perform = mode === 'perform';
  const best = memory.challenges.length ? Math.max(...memory.challenges.map(c => c.score)) : null;
  return `<section class="puppet-page" data-studio-mode="${mode}">
    <a class="back-link" href="#${perform?'stage':'learn'}">‹ 返回${perform?'戏台':'学艺'}</a>
    <div class="studio-heading"><div><span class="studio-eyebrow">泰兴杖头木偶 · 指尖传艺</span><h1>${challenge?'一分钟挑战':perform?'正式登台':'操作木偶'}<small>非遗</small></h1><p>${challenge?'听口令，演完一招，再接下一招。':perform?'走上戏台，让故事在你的手中开始。':'执起木杖，让木偶在你手中活起来。'}</p></div></div>
    ${perform?`<div class="stage-picker" aria-label="选择舞台">${stages.map(([id,name])=>`<button data-studio="stage" data-id="${id}" aria-pressed="${memory.stage===id}" class="${memory.stage===id?'selected':''}"><img src="./assets/stage-${id}.jpg" alt="${name}"><span>${name}</span></button>`).join('')}</div><label class="play-picker">选择剧目 <select id="studio-play">${plays.map(p=>`<option ${memory.play===p?'selected':''}>${p}</option>`).join('')}</select></label>`:''}
    ${challenge?`<section class="challenge-board" aria-label="挑战进度"><div class="challenge-clock"><b id="studio-time">60</b><span>秒</span></div><div class="challenge-goal"><small id="challenge-caption">准备登台</small><strong id="studio-goal">完成 15 招身段</strong><span><b id="studio-count">0</b> / 15 招 · <b id="studio-score">0</b> 分</span></div><div class="best-score"><small>最佳</small><b id="studio-best">${best===null?'暂无':best}</b></div></section>`:''}
    <div class="stage-scene stage-${memory.stage}" aria-label="可交互木偶舞台">
      <div class="stage-plaque">${perform?escape(memory.play):'一方戏台 · 万般身段'}</div>
      <div class="puppet-host" id="puppet-host"></div>
      <aside class="action-rail" aria-label="动作选择"><h2>动作选择</h2>${ACTIONS.map((a,i)=>`<button data-puppet-action="${a.id}" aria-pressed="false" title="${a.name} · 快捷键 ${i+1}"><i>${actionGlyph[a.id]}</i><span>${a.name}</span></button>`).join('')}</aside>
      <span class="live-state" aria-live="polite"><i></i><span id="puppet-status">待机</span><small>实时操控中</small></span>
      <div class="stage-floor"></div>
    </div>
    <section class="puppet-control-panel" aria-label="操作键位"><div class="control-heading"><h2>操作键位 <span>❖</span></h2><button data-puppet-reset aria-label="复位木偶位置与姿态">↺ 复位</button></div>
      <div class="control-grid"><div class="joystick-wrap"><div class="joystick" data-joystick role="group" aria-label="移动木偶摇杆"><span class="joy-n">▲</span><span class="joy-s">▼</span><span class="joy-w">◀</span><span class="joy-e">▶</span><div class="joystick-knob"></div></div><small>移动木偶</small></div><div class="arm-controls"><button data-hold-arm="left" aria-label="按住抬起左臂"><b>╱</b>左臂<small>按住抬起</small></button><button data-hold-arm="right" aria-label="按住抬起右臂"><b>╲</b>右臂<small>按住抬起</small></button><button data-puppet-action="turn"><b>⟳</b>转身</button><button data-puppet-action="sleeve"><b>〰</b>挥袖</button></div></div>
    </section>
    <p class="control-hint">双指配合：移动时也能抬起手臂。动作演完后自然收势。</p>
    <details class="keyboard-help"><summary>电脑快捷键与操作帮助</summary><p>方向键 / WASD 移动 · Q / E 按住抬臂<br>1 点头 · 2 拍手 · 3 转身 · 4 挥袖 · 5 行走 · R 复位<br>松开摇杆或按键即停止移动。触摸取消、离开页面会释放控制。</p></details>
    ${challenge?`<div class="studio-actions"><button class="btn" data-studio="challenge-start">开始挑战 →</button><button class="btn outline" data-studio="challenge-end" disabled>结束挑战</button></div><div id="studio-result" aria-live="polite"></div><p class="notice">每个目标 10 分，共 15 招。仅在目标动画完整结束后计分；重复点击不会重复得分。倒计时 60 秒，完成全部目标会提前结算。</p>`:perform?`<div class="performance-status" id="performance-status" role="status">准备就绪 · 尚未开始记录</div><div class="studio-actions"><button class="btn" data-studio="record-start">开始表演 →</button><button class="btn outline" data-studio="record-end" disabled>结束表演</button><button class="btn outline" data-studio="replay" ${memory.recordings.length?'':'disabled'}>动作回放</button></div><div class="replay-progress" hidden><span></span></div><p class="notice">舞台动作回放 · 记录移动、左右臂及动作时间，保存在本机；最长 2 分钟。本版未启用摄像头，AR 可视化回溯暂以舞台回放呈现。</p><a class="text-link" href="#performances">查看我的演出 →</a>`:`<section class="lesson-cards"><div class="section-head"><h2>基础动作学习</h2><a href="#challenge" class="text-link">一分钟挑战 →</a></div>${ACTIONS.map(a=>`<article data-lesson="${a.id}"><div><h3>${a.name}<small>${memory.practiced.includes(a.id)?'✓ 已练习':'待练习'}</small></h3><p>${a.tip}</p></div><button data-studio="demo" data-id="${a.id}" aria-label="播放${a.name}示范">播放示范</button></article>`).join('')}<p class="notice">在舞台点选动作或按快捷键，完整演完即可保存练习进度。播放示范不计入挑战成绩。</p></section><div class="studio-actions"><a href="#challenge" class="btn">开始一分钟挑战 →</a><a href="#perform" class="btn outline">正式登台</a></div>`}
  </section>`;
}

export function renderRecordings() {
  return `<a class="back-link" href="#me">‹ 返回我的</a><div class="page-heading"><div><h1>我的演出</h1><p>把指尖的好戏，再看一遍。</p></div></div>${memory.recordings.length?memory.recordings.slice().reverse().map(r=>`<article class="performance-card"><img src="./assets/stage-${r.stage}.jpg" alt="${escape(r.stageName)}"><div><h2>${escape(r.play)}</h2><p>${escape(r.stageName)} · ${Math.round(r.duration/1000)} 秒</p><small>${escape(r.date)}</small><button class="text-link" data-action="play-recording" data-id="${r.id}">动作回放 →</button></div></article>`).join(''):`<div class="empty"><h3>好戏，等你开场</h3><p>正式登台后，演出记录会保存在这里。</p><a class="btn" href="#perform">去正式登台 →</a></div>`}`;
}

export function mountStudio(root, { onLesson = ()=>{}, onToast = ()=>{}, color = 0, onRecord = ()=>{}, onChallenge = ()=>{} } = {}) {
  const host = root.querySelector('#puppet-host');
  if (!host) return () => {};
  const $ = s => root.querySelector(s);
  const mode = $('[data-studio-mode]').dataset.studioMode;
  let destroyed = false, challenge = null, record = null, playback = null, lastState = '', demoTimer = null;
  const tokens = new Set();
  const controller = new PuppetController(host, {
    color,
    onStateChange(snapshot) {
      if (destroyed) return;
      const status = snapshot.status || snapshot.currentAction || '待机';
      if (lastState !== status) { $('#puppet-status').textContent = status; lastState = status; }
      root.querySelectorAll('[data-puppet-action]').forEach(b => {
        const selected = b.dataset.puppetAction === snapshot.currentAction;
        b.classList.toggle('active',selected); b.setAttribute('aria-pressed',String(selected));
      });
    },
    onInput(event) {
      if (record) record.events.push({ ...event, t: performance.now() - record.started });
    },
    onActionComplete(event) {
      if (destroyed || tokens.has(event.token)) return;
      tokens.add(event.token);
      if (tokens.size > 200) tokens.delete(tokens.values().next().value);
      if (event.source === 'user' && !playback) {
        if (!memory.practiced.includes(event.id)) { memory.practiced.push(event.id); persist(); }
        const badge = $(`[data-lesson="${event.id}"] h3 small`); if (badge) badge.textContent = '✓ 已练习';
        if (memory.practiced.length >= ACTIONS.length) onLesson('practice');
      }
      if (!challenge?.running || event.source !== 'user') return;
      const now = performance.now();
      if (now >= challenge.deadline) { endChallenge('time'); return; }
      if (event.startedAt < challenge.goalSince) return;
      if (event.id !== challenge.sequence[challenge.count]) { onToast('这一招演得很好，再试试当前目标'); return; }
      challenge.count++; challenge.goalSince = now;
      $('#studio-count').textContent = challenge.count; $('#studio-score').textContent = challenge.count * 10;
      if (challenge.count === challenge.sequence.length) endChallenge('complete'); else updateGoal();
    }
  });
  // Exposes the running controller for local integration and browser verification.
  host.__puppet = controller;
  const inputCleanup = bindPuppetInputs(root, controller);
  const allowed = value => root.querySelectorAll('[data-puppet-action],[data-hold-arm],[data-puppet-reset]').forEach(b => b.disabled = !value);
  const controls = value => { root.dataset.inputDisabled=String(!value); allowed(value); $('[data-joystick]').style.pointerEvents = value?'':'none'; $('[data-joystick]').inert = !value; };
  function updateGoal() {
    const a = ACTIONS.find(a => a.id === challenge.sequence[challenge.count]);
    $('#challenge-caption').textContent = `当前目标 · 第 ${challenge.count + 1} 招`;
    $('#studio-goal').textContent = a.name;
  }
  function endChallenge(reason = 'manual') {
    if (!challenge?.running) return;
    challenge.running = false; controller.stopInputs(); controller.reset();
    const score = challenge.count * 10, seconds = Math.min(60, Math.ceil((performance.now()-challenge.started)/1000));
    const result = { id: newId(), score, count: challenge.count, seconds, date: new Date().toLocaleString('zh-CN'), reason, controllerVersion: 2 };
    memory.challenges.push(result); persist(); onChallenge(result);
    if (score >= 50) onLesson('challenge');
    $('#studio-goal').textContent = reason==='complete'?'十五招，漂亮收势！':reason==='time'?'时间到，收势！':'本次挑战已结束';
    $('#challenge-caption').textContent = '挑战结算';
    $('#studio-best').textContent = Math.max(...memory.challenges.map(c=>c.score));
    $('#studio-result').innerHTML = `<div class="result-box"><span class="studio-eyebrow">本次成绩</span><h3>${score} 分 · 完成 ${result.count} 招</h3><p>用时 ${seconds} 秒，最佳 ${Math.max(...memory.challenges.map(c=>c.score))} 分。${score>=50?'已点亮挑战成就。':'再来一次，慢慢找到节奏。'}</p></div>`;
    $('[data-studio="challenge-start"]').disabled = false; $('[data-studio="challenge-start"]').textContent = '重新挑战 →';
    $('[data-studio="challenge-end"]').disabled = true;
  }
  function startChallenge() {
    if (challenge?.running) return;
    clearTimeout(demoTimer); controller.reset();
    const sequence = Array.from({length:15},(_,i)=>ACTIONS[i%5].id);
    const started = performance.now(); challenge = {running:true, count:0, sequence, started, deadline:started+60000, goalSince:started};
    $('#studio-time').textContent = '60'; $('#studio-count').textContent = '0'; $('#studio-score').textContent = '0'; $('#studio-result').innerHTML = '';
    $('[data-studio="challenge-start"]').disabled = true; $('[data-studio="challenge-end"]').disabled = false;
    updateGoal();
  }
  function finishRecording(aborted = false) {
    if (!record) return;
    controller.stopInputs();
    const r = record; record = null;
    const duration = Math.min(120000, performance.now() - r.started);
    if (duration < 500) { if (!destroyed) { onToast('表演时间太短，请重新开始'); $('#performance-status').textContent='准备就绪 · 请重新开始表演'; $('[data-studio="record-start"]').disabled=false; $('[data-studio="record-end"]').disabled=true; $('[data-studio="replay"]').disabled=!memory.recordings.length; stageButtons(false); } return; }
    const saved = { id: newId(), stage:memory.stage, stageName:stages.find(s=>s[0]===memory.stage)?.[1]||'水乡戏台', play:memory.play, date:new Date().toLocaleString('zh-CN'), duration, events:r.events, color, interrupted:aborted };
    memory.recordings.push(saved); memory.recordings = memory.recordings.slice(-20); replayId = saved.id; persist(); onRecord(saved); onLesson('perform');
    if (!destroyed) { $('#performance-status').textContent = `已保存 · ${Math.round(duration/1000)} 秒 · ${saved.events.length} 条操作${aborted?' · 离开时自动收录':''}`; $('[data-studio="record-start"]').disabled = false; $('[data-studio="record-end"]').disabled = true; $('[data-studio="replay"]').disabled = false; stageButtons(false); }
  }
  function stageButtons(disabled) { root.querySelectorAll('[data-studio="stage"],#studio-play').forEach(b=>b.disabled=disabled); }
  function startRecording() {
    if (record || playback) return;
    controller.reset(); record = {started:performance.now(), events:[]};
    $('#performance-status').textContent = '● 正在记录表演 · 00:00';
    $('[data-studio="record-start"]').disabled = true; $('[data-studio="record-end"]').disabled = false; $('[data-studio="replay"]').disabled = true; stageButtons(true);
  }
  function stopReplay() {
    if (!playback) return;
    playback = null; controller.reset(); controller.stopInputs(); controls(true); stageButtons(false);
    $('.replay-progress').hidden = true; $('[data-studio="record-start"]').disabled = false; $('[data-studio="replay"]').textContent = '动作回放';
    $('#performance-status').textContent = '回放已结束 · 可以再次登台';
    $('.stage-scene').classList.remove('stage-water','stage-city','stage-plum'); $('.stage-scene').classList.add('stage-'+memory.stage); $('.stage-plaque').textContent=memory.play;
    controller.setColor(color);
  }
  function startReplay() {
    if (playback) { stopReplay(); return; }
    const saved = memory.recordings.find(r=>r.id===replayId) || memory.recordings.at(-1);
    if (!saved || record) return;
    controller.reset(); controller.stopInputs(); controls(false); stageButtons(true);
    controller.setColor(saved.color||0);
    playback = {record:saved, started:performance.now()+120, index:0};
    const scene=$('.stage-scene'); scene.classList.remove('stage-water','stage-city','stage-plum'); scene.classList.add('stage-'+saved.stage);
    $('.stage-plaque').textContent=saved.play;
    $('#performance-status').textContent = `回放中 · ${saved.play} · ${saved.stageName}`;
    $('[data-studio="record-start"]').disabled = true; $('[data-studio="replay"]').textContent = '停止回放'; $('.replay-progress').hidden = false;
  }
  function processReplay() {
    if (!playback) return;
    const elapsed = performance.now()-playback.started, saved=playback.record;
    while (playback && playback.index < saved.events.length && saved.events[playback.index].t <= elapsed) {
      const ev = saved.events[playback.index];
      if (ev.type==='action' && !controller.trigger(ev.id,{source:'replay'})) break;
      playback.index++;
      if (ev.type==='move') controller.setMove(ev.x,ev.y,{source:'replay'});
      else if (ev.type==='arm') controller.setArm(ev.side,ev.held,{source:'replay'});
      else if (ev.type==='reset') controller.reset({source:'replay'});
    }
    $('.replay-progress span').style.width = Math.max(0,Math.min(100,elapsed/saved.duration*100))+'%';
    // Let a final accepted action settle completely before ending playback.
    if (elapsed >= saved.duration && !controller.snapshot().busy) stopReplay();
  }
  const click = e => {
    const b=e.target.closest('[data-studio]'); if (!b || b.disabled) return;
    switch (b.dataset.studio) {
      case 'demo': if(controller.trigger(b.dataset.id,{source:'demo'})) { $('.stage-scene').scrollIntoView({block:'center',behavior:'smooth'}); onToast('示范中：'+ACTIONS.find(a=>a.id===b.dataset.id).name+'。演完后点动作练习。'); } break;
      case 'challenge-start': startChallenge(); break;
      case 'challenge-end': endChallenge('manual'); break;
      case 'record-start': startRecording(); break;
      case 'record-end': finishRecording(); break;
      case 'replay': startReplay(); break;
      case 'stage': {
        memory.stage=b.dataset.id; persist();
        root.querySelectorAll('[data-studio="stage"]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});
        $('.stage-scene').classList.remove('stage-water','stage-city','stage-plum'); $('.stage-scene').classList.add('stage-'+memory.stage); break;
      }
    }
  };
  const change = e => { if(e.target.id==='studio-play'){ memory.play=e.target.value; persist(); $('.stage-plaque').textContent=memory.play; } };
  root.addEventListener('click',click); root.addEventListener('change',change);
  let frame;
  function tick() {
    if (destroyed) return;
    if (challenge?.running) { const left=Math.max(0,Math.ceil((challenge.deadline-performance.now())/1000)); $('#studio-time').textContent=String(left).padStart(2,'0'); if(!left)endChallenge('time'); }
    if (record) { const secs=Math.floor((performance.now()-record.started)/1000); $('#performance-status').textContent=`● 正在记录表演 · ${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`; if(secs>=120)finishRecording(); }
    processReplay(); frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);
  if (storageNotice) onToast('本机存储空间不足，部分记录可能未保存');
  const pageHide = () => { if(record)finishRecording(true); if(challenge?.running)endChallenge('leave'); if(playback)stopReplay(); controller.stopInputs(); };
  const visibility = () => { if(document.hidden)pageHide(); };
  window.addEventListener('pagehide',pageHide); document.addEventListener('visibilitychange',visibility);
  const blur = () => { if(playback)stopReplay(); };
  window.addEventListener('blur',blur);
  return () => {
    if(challenge?.running)endChallenge('leave'); if(record)finishRecording(true);
    destroyed=true; cancelAnimationFrame(frame); clearTimeout(demoTimer); inputCleanup(); controller.destroy(); root.dataset.inputDisabled='false';
    root.removeEventListener('click',click); root.removeEventListener('change',change); window.removeEventListener('pagehide',pageHide); window.removeEventListener('blur',blur); document.removeEventListener('visibilitychange',visibility); delete host.__puppet;
  };
}
