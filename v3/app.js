import { art, esc, icon, button, title, loadState, plays } from './core.js';
import { renderLearning, bindLearning, captureLearningView, restoreLearningView, restoreLearningOverlay } from './learning.js';
import { renderContent, bindContent, captureContentView, restoreContentView } from './content.js';
import { renderStudio, mountStudio, studioData } from './studio.js';
import { openTheatreVideo } from './theatre-video.js';
import { initializePlatform } from './platform.js';
import { createBrowserNavigation } from './navigation.js';

const state = loadState(), main = document.querySelector('#main'), nav = document.querySelector('#navigation');
const items = [['theatre', '戏台'], ['learn', '学艺'], ['backstage', '幕后'], ['shop', '文创'], ['me', '我的']];
let cleanups = [], noticeTimer, returnFocus, renderedRoute = '', restoration = 0;
let navigation;
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
function toast(text) {
  const el = document.querySelector('#toast'); el.textContent = text; el.hidden = false;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => el.hidden = true, 3500);
}
function save() {
  try { localStorage.setItem('muhou-app-v3', JSON.stringify(state)); return true; }
  catch { toast('本机存储不可用，本次更改仅在当前会话保留。'); return false; }
}
function onLesson(id) { if (!state.lessons.includes(id)) { state.lessons.push(id); save(); } }
function selectorFor(element) {
  if (!(element instanceof Element) || !main.contains(element) || element === main) return null;
  const path = [];
  while (element && element !== main) {
    path.unshift(`${element.tagName.toLowerCase()}:nth-child(${[...element.parentElement.children].indexOf(element) + 1})`);
    element = element.parentElement;
  }
  return '#main > ' + path.join(' > ');
}
function captureView(previous = {}) {
  const overlay = navigation?.current.overlay;
  if (overlay?.kind === 'search') overlay.query = document.querySelector('#global-search')?.value ?? overlay.query;
  if (overlay?.kind === 'video') overlay.time = document.querySelector('.theatre-video-player')?.currentTime ?? overlay.time;
  return {
    ...previous, scrollY: window.scrollY,
    focus: selectorFor(document.activeElement) || previous.focus || null,
    learning: captureLearningView(), content: captureContentView(),
    craftDraft: clone(state.craftDraft), activeWorkId: state.activeWorkId,
    innerScroll: [...main.querySelectorAll('*')].filter(el => el.scrollTop || el.scrollLeft).map(el => ({ selector: selectorFor(el), top: el.scrollTop, left: el.scrollLeft }))
  };
}
function hideModal() {
  const el = document.querySelector('#modal-root');
  const wasOpen = el.hasChildNodes();
  el.replaceChildren(); main.inert = false; nav.inert = false;
  document.body.classList.remove('modal-open');
  if (wasOpen) window.dispatchEvent(new Event('muhou-resume'));
}
function displayModal(html) {
  hideModal(); returnFocus = document.activeElement;
  window.dispatchEvent(new Event('muhou-pause'));
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop"><section class="paper-modal" role="dialog" aria-modal="true" aria-label="内容详情" tabindex="-1"><button class="modal-close icon-button" data-action="close" aria-label="关闭">${icon('close')}</button>${html}</section></div>`;
  main.inert = true; nav.inert = true; document.body.classList.add('modal-open');
  document.querySelector('.modal-close').focus();
}
function openModal(html, descriptor = { kind: 'html' }) {
  navigation.openOverlay({ ...descriptor, html }); displayModal(html);
}
function closeModal() { if (navigation.current.overlay) navigation.back(); else hideModal(); }
const navigate = (route, options = {}) => navigation.navigate(route, options);
const ctx = { state, save, navigate, repaint: () => navigation.repaint(), goBack: () => navigation.back(), toast, studioData, onLesson, openModal, asset: name => name.match(/\.(png|jpg|webp|svg)$/) ? art(name) : `./assets/${name}.jpg` };
function renderNav() {
  nav.innerHTML = items.map(([id, name]) => `<button data-go="${id}" class="nav-item ${navigation.tab === id ? 'selected' : ''}" ${navigation.tab === id ? 'aria-current="page"' : ''}><img src="${art(`nav-${id}.png`)}" alt=""><span>${name}</span></button>`).join('');
  nav.style.setProperty('--nav-count', items.length);
}
function restoreScroll(view, restoreFocus) {
  const token = ++restoration;
  const targetScrollY = Number.isFinite(view.scrollY) ? view.scrollY : 0;
  let attempts = 0;
  const apply = () => {
    if (token !== restoration) return;
    const editor = main.querySelector('[data-workshop-editor]'), rig = main.querySelector('#v3-puppet-host');
    const pending = [...main.querySelectorAll('img')].some(img => !img.complete) || (editor && editor.dataset.ready !== 'true') || (rig && rig.dataset.rigStatus === 'loading');
    if (pending && attempts++ < 180) { requestAnimationFrame(apply); return; }
    if (restoreFocus && !navigation.current.overlay) {
      let target;
      try { target = view.focus && document.querySelector(view.focus); } catch { /* Ignore obsolete selectors. */ }
      (target || main).focus?.({ preventScroll: true });
    }
    for (const scroll of view.innerScroll || []) {
      try { const target = document.querySelector(scroll.selector); if (target) { target.scrollTop = scroll.top; target.scrollLeft = scroll.left; } } catch { /* Removed controls need no restoration. */ }
    }
    window.scrollTo(0, targetScrollY);
  };
  requestAnimationFrame(() => requestAnimationFrame(apply));
}
function renderOverlay(descriptor) {
  if (restoreLearningOverlay(descriptor)) navigation.save();
  if (descriptor.kind === 'search') {
    displayModal(searchHTML); document.querySelector('#global-search').value = descriptor.query || '';
    updateSearch(descriptor.query || ''); document.querySelector('#global-search').focus();
  } else if (descriptor.kind === 'video') {
    cleanups.push(openTheatreVideo(descriptor.id, { ...ctx, openModal: displayModal }, { restored: true, time: descriptor.time || 0 }));
  } else displayModal(descriptor.html || '');
}
function render(reason = 'initial') {
  for (const cleanup of cleanups) cleanup?.(); cleanups = []; hideModal();
  const entry = navigation.current, r = entry.route, view = entry.view || {};
  if (view.learning && restoreLearningView(view.learning)) navigation.save();
  if (view.content) restoreContentView(view.content);
  if (r === 'learn/workshop' && view.craftDraft) {
    const draft = clone(view.craftDraft);
    // Navigation never resurrects a deleted work or rolls saved data backwards.
    if (draft.id && !state.works.some(work => work.id === draft.id)) delete draft.id;
    state.craftDraft = draft;
  }
  if (r === 'learn/control' && view.activeWorkId && state.works.some(work => work.id === view.activeWorkId)) state.activeWorkId = view.activeWorkId;
  renderedRoute = r; renderNav();
  const html = r === 'learn/control' ? renderStudio(ctx) : renderLearning(r, ctx) ?? renderContent(r, ctx);
  main.innerHTML = html ?? `${title('这一页还未找到', '', 'theatre')}<div class="page-pad">${button('返回戏台', 'theatre')}</div>`;
  const backButtons = main.querySelectorAll('.round-back, .c-back, .v3-studio-back');
  for (const back of backButtons) { back.dataset.back = ''; delete back.dataset.go; back.setAttribute('aria-label', '返回上一页'); }
  if (navigation.canBack && !backButtons.length) main.insertAdjacentHTML('afterbegin', `<div class="page-pad navigation-return"><button class="round-back" data-back aria-label="返回上一页">${icon('back')}</button></div>`);
  document.title = `幕后的人 · ${r === 'learn/control' ? '操偶课堂' : items.find(([key]) => key === navigation.tab)?.[1] || '木偶非遗互动'}`;
  cleanups.push(bindLearning(main, ctx), bindContent(main, ctx));
  if (r === 'learn/control') cleanups.push(mountStudio(main, ctx));
  if (entry.overlay) renderOverlay(entry.overlay);
  restoreScroll(view, ['initial', 'traverse', 'tab'].includes(reason));
  if (state.recovered) { state.recovered = false; toast('已跳过损坏的旧记录，可继续使用。'); }
}
const searchHTML = '<h2>寻一出好戏，遇一门手艺</h2><label class="search-field">搜索<input id="global-search" placeholder="剧目、课程、文创…" autocomplete="off"></label><div id="search-results"></div>';
function searchModal() { openModal(searchHTML, { kind: 'search', query: '' }); document.querySelector('#global-search').focus(); updateSearch(''); }
const searchItems = [...plays.map(p => [p.name, '经典剧目', `theatre/plays/${p.id}`]), ...['认识木偶', '制作工坊', '操偶课堂'].map((n, i) => [n, '学艺体验', `learn/${['puppet', 'workshop', 'control'][i]}`]), ['木偶摆件', '文创好物', 'shop/categories'], ['后台探索', '走近幕后', 'backstage/explore']];
function updateSearch(q) {
  const results = searchItems.filter(v => v.join(' ').includes(q.trim()));
  document.querySelector('#search-results').innerHTML = results.length ? results.map(([name, sub, to]) => `<button class="search-result" data-go="${to}"><b>${name}</b><small>${sub}</small><span>→</span></button>`).join('') : '<p>暂无匹配内容，试试“木偶”或“课程”。</p>';
}

document.addEventListener('click', async e => {
  if (e.defaultPrevented || e.button > 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  const back = e.target.closest('[data-back]');
  if (back) { e.preventDefault(); navigation.back(); return; }
  const tab = e.target.closest('#navigation [data-go]');
  if (tab) { navigation.selectTab(tab.dataset.go); return; }
  const go = e.target.closest('[data-go]'), link = e.target.closest('a[href^="#/"]');
  if (go || link) { e.preventDefault(); navigate(go ? go.dataset.go : link.getAttribute('href')); return; }
  if (e.target.closest('a.skip')) { e.preventDefault(); main.focus(); window.scrollTo(0, 0); return; }
  const b = e.target.closest('[data-action]'); if (!b) return;
  const action = b.dataset.action;
  if (action === 'close') closeModal();
  if (action === 'search') searchModal();
  if (action === 'share') {
    const text = `${b.dataset.title || '幕后的人'}\n${b.dataset.text || '一方戏台，万般人生。'}`;
    try {
      if (navigator.share) await navigator.share({ title: '幕后的人', text });
      else {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' }), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = '幕后的人-分享卡.txt'; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('分享卡已保存');
      }
    } catch (error) { if (error.name !== 'AbortError') toast('分享未完成，请重试。'); }
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'global-search') { updateSearch(e.target.value); if (navigation.current.overlay?.kind === 'search') { navigation.current.overlay.query = e.target.value; navigation.save(); } }
});
document.addEventListener('keydown', e => {
  const modal = document.querySelector('.paper-modal'); if (!modal) return;
  if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
  if (e.key === 'Tab') {
    const nodes = [...modal.querySelectorAll('button,a[href],input,select,[tabindex="0"]')].filter(el => !el.disabled);
    if (!nodes.length) return;
    const first = nodes[0], last = nodes.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
document.querySelector('#modal-root').addEventListener('click', e => { if (e.target.classList.contains('modal-backdrop')) closeModal(); });
window.addEventListener('storage', e => { if (e.key === 'muhou-app-v3') { navigation.remember(); Object.assign(state, loadState()); render('refresh'); } });
window.addEventListener('error', e => { if (e.target instanceof HTMLImageElement) { e.target.classList.add('image-failed'); e.target.alt = e.target.alt || '素材暂未加载，请刷新重试'; } }, true);
for (const event of ['pointerdown', 'wheel', 'touchstart']) window.addEventListener(event, () => restoration++, { passive: true });
let scrollTimer;
window.addEventListener('scroll', () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(() => { navigation.current.view.scrollY = window.scrollY; navigation.save(); }, 100); }, { passive: true });
navigation = createBrowserNavigation({ window, capture: captureView, onChange: render });
window.__muhou = {
  get state() { return state; }, get route() { return renderedRoute; },
  get navigation() { return navigation.model.snapshot(); }, studioData, navigate,
  goBack: () => navigation.back(), selectTab: tab => navigation.selectTab(tab), nativeBack: () => navigation.back()
};
render();
initializePlatform({ onBack: () => navigation.back(), onPause: () => { navigation.remember(); window.dispatchEvent(new Event('blur')); } });