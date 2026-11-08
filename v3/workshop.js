import { esc, uid, title, section } from './core.js';
import { WORKSHOP_ASSETS, WORKSHOP_PARTS, normalizeComposition, compositionSummary, partName, saveComposition } from './workshop-model.js';
import { WorkshopRenderer } from './workshop-renderer.js';

function picker(kind, draft) {
  const head = kind === 'head';
  return WORKSHOP_PARTS.map(part => `<button class="workshop-part ${draft[`${kind}Id`] === part.id ? 'selected' : ''}" data-workshop-action="select" data-kind="${kind}" data-id="${part.id}" aria-label="${head ? '头部' : '身体'}：${part.name}" aria-pressed="${draft[`${kind}Id`] === part.id}"><img src="${WORKSHOP_ASSETS}/thumbnails/${kind}-${part.id}.png" alt="" width="144" height="${head ? 144 : 192}"><span>${part.name}</span></button>`).join('');
}

export function renderWorkshop(ctx) {
  const draft = normalizeComposition(ctx.state.craftDraft);
  return `<section class="learning-page workshop-page workshop-v4">${title('制作工坊', '设计木偶 · 自由搭配头部与戏服', 'learn')}
    <div class="workshop-top paper-panel"><button data-go="learn/puppet">认识木偶</button><button class="selected" data-go="learn/control">操偶课堂 →</button></div>
    <div class="page-pad">${section('自由创作', 'me/works', '我的作品')}<p class="workshop-intro">一副眉眼，一袭戏服，组合属于你的木偶。</p>
      <div data-workshop-editor data-ready="false">
        ${draft.id ? '<p class="workshop-editing">正在编辑已保存的作品<button data-workshop-action="new">新建木偶 →</button></p>' : ''}
        <div class="workshop-stage paper-panel"><span class="workshop-stage-seal" aria-hidden="true">我的木偶</span><div class="workshop-stage-ring" aria-hidden="true"></div><canvas class="workshop-canvas" width="1024" height="1536" role="img" aria-label="${esc(compositionSummary(draft))}"></canvas><div class="workshop-stage-tools"><button data-workshop-action="random" aria-label="随机搭配头部和身体">换一搭配</button><button data-workshop-action="reset" aria-label="重置木偶造型">↻ 重置</button></div></div>
        <p class="workshop-pair" data-workshop-pair>${esc(compositionSummary(draft))}</p>
        <div class="workshop-load-state" role="status" aria-live="polite"><span data-workshop-status>正在装扮木偶…</span><button data-workshop-action="retry" hidden>重新加载</button></div>
        <section class="workshop-part-section"><div class="workshop-part-heading"><h3>选择头部</h3><span>共八款</span></div><p>头饰、头发与胡须随头部一起更换</p><div class="workshop-head-grid">${picker('head', draft)}</div></section>
        <section class="workshop-part-section"><div class="workshop-part-heading"><h3>选择身体</h3><span>左右滑动查看更多</span></div><div class="workshop-body-row" aria-label="八款木偶身体">${picker('body', draft)}</div></section>
        <label class="craft-name" for="craft-name">为木偶起个名字<input id="craft-name" maxlength="16" value="${esc(draft.name)}" placeholder="如：听雨小生" autocomplete="off"></label>
        <button class="paper-button wide" data-workshop-action="save" disabled>完成你的木偶<small>保存造型，立即进入操偶课堂</small></button>
      </div>
    </div>
  </section>`;
}

export function mountWorkshop(root, ctx) {
  const editor = root.querySelector('[data-workshop-editor]');
  if (!editor) return () => {};
  let draft = normalizeComposition(ctx.state.craftDraft);
  let active = true;
  const canvas = editor.querySelector('canvas');
  const renderer = new WorkshopRenderer(canvas);
  const status = editor.querySelector('[data-workshop-status]');
  const retry = editor.querySelector('[data-workshop-action="retry"]');
  const save = editor.querySelector('[data-workshop-action="save"]');
  const name = editor.querySelector('#craft-name');
  const pair = editor.querySelector('[data-workshop-pair]');
  const persist = () => { ctx.state.craftDraft = { ...draft }; ctx.save(); };

  async function update() {
    const headId = draft.headId, bodyId = draft.bodyId;
    editor.dataset.ready = 'false';
    save.disabled = true;
    retry.hidden = true;
    status.textContent = '正在装扮木偶…';
    for (const button of editor.querySelectorAll('[data-workshop-action="select"]')) {
      const selected = draft[`${button.dataset.kind}Id`] === button.dataset.id;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    try {
      if (!await renderer.setParts(headId, bodyId) || !active) return;
      editor.dataset.ready = 'true';
      editor.dataset.head = headId;
      editor.dataset.body = bodyId;
      save.disabled = false;
      status.textContent = '';
      pair.textContent = `${partName(headId)} · ${partName(bodyId)}`;
      canvas.setAttribute('aria-label', pair.textContent);
    } catch {
      if (!active) return;
      status.textContent = '木偶素材暂未加载，请重试';
      retry.hidden = false;
    }
  }

  function click(event) {
    const button = event.target.closest('[data-workshop-action]');
    if (!button || !editor.contains(button)) return;
    const action = button.dataset.workshopAction;
    if (action === 'select') {
      if (!['head', 'body'].includes(button.dataset.kind) || !WORKSHOP_PARTS.some(part => part.id === button.dataset.id)) return;
      draft[`${button.dataset.kind}Id`] = button.dataset.id;
      persist();
      void update();
    } else if (action === 'new') {
      draft = normalizeComposition(null);
      name.value = '';
      editor.querySelector('.workshop-editing')?.remove();
      persist();
      void update();
    } else if (action === 'reset') {
      // Reset the appearance without discarding a name or an existing work identity.
      draft = { ...draft, headId: '01', bodyId: '01' };
      persist();
      void update();
    } else if (action === 'random') {
      draft.headId = WORKSHOP_PARTS[Math.floor(Math.random() * WORKSHOP_PARTS.length)].id;
      draft.bodyId = WORKSHOP_PARTS[Math.floor(Math.random() * WORKSHOP_PARTS.length)].id;
      persist();
      void update();
    } else if (action === 'retry') {
      void update();
    } else if (action === 'save') {
      if (save.disabled || renderer.current?.headId !== draft.headId || renderer.current?.bodyId !== draft.bodyId) return;
      draft.name = name.value;
      const result = saveComposition(ctx.state.works, draft, uid());
      ctx.state.works = result.works;
      // Returning through the learning page starts another creation; only an
      // explicit "再次编辑" carries a saved work id and updates that work.
      const { id, createdAt, ...nextDraft } = result.work;
      ctx.state.craftDraft = normalizeComposition(nextDraft);
      ctx.state.activeWorkId = result.work.id;
      const persisted = ctx.save();
      ctx.onLesson('craft');
      ctx.toast(persisted === false ? '本机存储不可用，木偶仅在当前会话保留，可继续操偶。' : '木偶已保存，开始操偶吧');
      ctx.navigate('learn/control');
    }
  }
  function input(event) {
    if (event.target === name) { draft.name = name.value.slice(0, 16); persist(); }
  }
  editor.addEventListener('click', click);
  editor.addEventListener('input', input);
  void update();
  return () => {
    active = false;
    renderer.dispose();
    editor.removeEventListener('click', click);
    editor.removeEventListener('input', input);
  };
}
