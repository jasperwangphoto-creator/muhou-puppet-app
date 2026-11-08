import { normalizeRoute, routeInfo, fallbackChain, TAB_IDS } from './routes.js';

export const NAVIGATION_KEY = 'muhou-navigation-v1';
const VERSION = 1;
const copy = value => JSON.parse(JSON.stringify(value));
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const frame = route => ({ key: uid(), route: normalizeRoute(route), view: {}, overlay: null });

/** Logical history is independent of browser slots and of saved business data. */
export function createNavigationModel(route = 'theatre', saved = null) {
  let data;
  try {
    if (saved?.version !== VERSION || !TAB_IDS.includes(saved.activeTab) || typeof saved.sessionId !== 'string') throw new Error('Invalid session');
    for (const tab of TAB_IDS) {
      const stack = saved.tabs[tab];
      if (!Array.isArray(stack.entries) || !stack.entries.length || stack.entries[0].route !== tab || stack.entries[0].overlay || !Number.isInteger(stack.index) || stack.index < 0 || stack.index >= stack.entries.length) throw new Error('Invalid stack');
      for (const entry of stack.entries) {
        if (typeof entry.key !== 'string' || typeof entry.route !== 'string' || normalizeRoute(entry.route) !== entry.route || !entry.view || typeof entry.view !== 'object' || Array.isArray(entry.view)) throw new Error('Invalid entry');
        if (entry.view.innerScroll !== undefined && (!Array.isArray(entry.view.innerScroll) || entry.view.innerScroll.some(item => !item || typeof item.selector !== 'string' || !Number.isFinite(item.top) || !Number.isFinite(item.left)))) throw new Error('Invalid scroll state');
        if (entry.overlay) {
          const overlay = entry.overlay;
          if (!['html', 'search', 'video'].includes(overlay.kind) || typeof overlay.html !== 'string' && overlay.kind === 'html') throw new Error('Invalid overlay');
          if (overlay.kind === 'search' && typeof overlay.query !== 'string') throw new Error('Invalid search');
          if (overlay.kind === 'video' && (typeof overlay.id !== 'string' || !Number.isFinite(overlay.time) || overlay.time < 0)) throw new Error('Invalid media');
        }
      }
    }
    data = copy(saved);
  } catch {
    const activeTab = routeInfo(route).tab;
    data = { version: VERSION, sessionId: uid(), activeTab, tabs: Object.fromEntries(TAB_IDS.map(tab => [tab, { entries: [frame(tab)], index: 0 }])) };
    const entries = fallbackChain(route).map(frame);
    data.tabs[activeTab] = { entries, index: entries.length - 1 };
  }
  const stack = () => data.tabs[data.activeTab];
  const model = {
    get data() { return data; },
    get tab() { return data.activeTab; },
    get current() { return stack().entries[stack().index]; },
    get depth() { return stack().index; },
    get stack() { return stack(); },
    snapshot: () => copy(data),
    push(route, { replace = false } = {}) {
      const next = frame(route);
      if (replace && stack().index > 0) stack().entries[stack().index] = next;
      else { stack().entries.splice(stack().index + 1); stack().entries.push(next); stack().index++; }
      return next;
    },
    overlay(descriptor) {
      if (model.current.overlay) { model.current.overlay = copy(descriptor); return false; }
      const next = { ...frame(model.current.route), view: copy(model.current.view), overlay: copy(descriptor) };
      stack().entries.splice(stack().index + 1); stack().entries.push(next); stack().index++;
      return true;
    },
    back() { if (!model.depth) return false; stack().index--; return true; },
    selectTab(tab) {
      if (!TAB_IDS.includes(tab)) return false;
      if (data.activeTab === tab) {
        stack().entries = [stack().entries[0]]; stack().index = 0;
        model.current.overlay = null; model.current.view.scrollY = 0; model.current.view.focus = null;
      } else {
        data.activeTab = tab;
        stack().entries.splice(stack().index + 1);
      }
      return true;
    },
    restore(tab, key) {
      const target = data.tabs[tab];
      const index = target?.entries.findIndex(entry => entry.key === key) ?? -1;
      if (index < 0) return false;
      data.activeTab = tab; target.index = index; return true;
    }
  };
  return model;
}

/** The adapter tags every owned slot. Tab epochs never become a logical Back step. */
export function createBrowserNavigation({ window: win, capture, onChange }) {
  let saved;
  try { saved = JSON.parse(win.sessionStorage.getItem(NAVIGATION_KEY)); } catch { /* Private mode or damaged navigation is nonfatal. */ }
  const initial = normalizeRoute(win.location.hash);
  const tag = () => {
    const value = win.history.state?.muhouNavigation;
    return value?.version === VERSION && typeof value.sessionId === 'string' && typeof value.epoch === 'string' && TAB_IDS.includes(value.tab) && typeof value.key === 'string' && Number.isSafeInteger(value.position) && value.position >= 0 ? value : null;
  };
  let model = createNavigationModel(initial, saved);
  let epoch = uid(), position = Number.isSafeInteger(tag()?.position) ? tag().position : 0;
  let waiting = false, disposed = false, backTimer;
  const pending = [];
  win.history.scrollRestoration = 'manual';
  const persist = () => { try { win.sessionStorage.setItem(NAVIGATION_KEY, JSON.stringify(model.snapshot())); } catch { /* In-memory navigation remains usable. */ } };
  const metadata = () => ({ version: VERSION, sessionId: model.data.sessionId, epoch, tab: model.tab, key: model.current.key, position });
  const write = (method = 'replaceState') => {
    win.history[method]({ ...(method === 'replaceState' ? win.history.state : null), muhouNavigation: metadata() }, '', '#/' + model.current.route);
    persist();
  };
  const notify = reason => onChange?.(reason);
  const remember = () => { if (capture) model.current.view = capture(model.current.view); persist(); };
  const drain = () => { clearTimeout(backTimer); waiting = false; const next = pending.shift(); if (next) next(); };
  const run = action => { if (waiting) { pending.push(() => run(action)); return; } action(); };
  const owned = tag();
  if (owned?.sessionId === model.data.sessionId && model.restore(owned.tab, owned.key) && model.current.route === initial) {
    epoch = owned.epoch; position = owned.position;
    write();
  } else {
    // An unrelated URL is a deep link, not the last active page from this session.
    if (saved) model = createNavigationModel(initial);
    const targetIndex = model.stack.index;
    model.stack.index = 0; write();
    for (let i = 1; i <= targetIndex; i++) { model.stack.index = i; position++; write('pushState'); }
  }
  function startEpoch() {
    epoch = uid();
    const targetIndex = model.stack.index;
    model.stack.index = 0; position++; write('pushState');
    for (let i = 1; i <= targetIndex; i++) { model.stack.index = i; position++; write('pushState'); }
  }
  const api = {
    get model() { return model; },
    get current() { return model.current; },
    get tab() { return model.tab; },
    get canBack() { return model.depth > 0; },
    remember,
    save: persist,
    navigate(route, options = {}) {
      run(() => {
        remember();
        const clean = normalizeRoute(route);
        if (model.current.route === clean && !model.current.overlay) {
          if (!options.keepScroll) model.current.view.scrollY = 0;
          write(); notify('refresh'); return;
        }
        const replacing = options.replace && model.depth > 0;
        model.push(clean, options);
        if (replacing) write();
        else { position++; write('pushState'); }
        notify('navigate');
      });
    },
    repaint() { remember(); write(); notify('refresh'); },
    selectTab(tab) {
      run(() => { remember(); if (model.selectTab(tab)) { startEpoch(); notify('tab'); } });
    },
    openOverlay(descriptor) {
      remember();
      const pushed = model.overlay(descriptor);
      if (pushed) { position++; write('pushState'); } else write();
    },
    back() {
      if (!model.depth || waiting) return waiting;
      remember(); waiting = true;
      win.history.back();
      // Some WebViews (and browsers after history eviction) have no traversable
      // physical slot even though our logical source is still available.
      if (waiting) backTimer = setTimeout(() => {
        if (!waiting || disposed) return;
        if (model.back()) { write(); notify('traverse'); }
        drain();
      }, 500);
      return true;
    },
    dispose() { clearTimeout(backTimer); disposed = true; win.removeEventListener('popstate', pop); win.removeEventListener('hashchange', hash); win.removeEventListener('pagehide', remember); }
  };
  function pop() {
    if (disposed) return;
    const incoming = tag();
    if (!incoming) {
      // Browsers can create an untagged same-document slot when the exact hash URL
      // is opened again. Resolve a known previous page/overlay before treating it
      // as an external boundary; a newly typed, different hash is adopted by hash().
      const previous = model.stack.entries[model.stack.index - 1];
      const sameRoute = normalizeRoute(win.location.hash) === model.current.route;
      if (previous && (waiting || model.current.overlay && sameRoute && previous.route === model.current.route)) {
        remember(); model.back(); position = Math.max(0, position - 1);
        write(); notify('traverse'); drain();
      } else if (sameRoute) write();
      return;
    }
    if (incoming.sessionId === model.data.sessionId && incoming.epoch === epoch) {
      remember(); position = incoming.position;
      if (model.restore(incoming.tab, incoming.key)) { persist(); notify('traverse'); drain(); return; }
    }
    // Back past this tab's root must skip earlier tab epochs without displaying them.
    // Replace the traversed slot first: if no external history exists, the root stays usable.
    const root = model.stack.entries[0];
    model.stack.index = 0; model.current.overlay = null;
    position = Number.isSafeInteger(incoming.position) ? incoming.position : 0;
    root.view.scrollY = 0; write(); notify('boundary'); drain();
    win.history.go(-(position + 1));
  }
  function hash() {
    if (disposed) return;
    const clean = normalizeRoute(win.location.hash);
    if (!tag() && !win.location.hash.startsWith('#/') && routeInfo(clean).unknown) return;
    if (tag()?.sessionId === model.data.sessionId && tag()?.key === model.current.key && clean === model.current.route) return;
    // Direct hash links from outside our event delegation are adopted once, in place.
    remember(); model.push(clean); position++; write(); notify('navigate'); drain();
  }
  win.addEventListener('popstate', pop);
  win.addEventListener('hashchange', hash);
  win.addEventListener('pagehide', remember);
  return api;
}