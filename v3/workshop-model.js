export const WORKSHOP_ART_VERSION = 4;
export const WORKSHOP_ASSET_PACK = 'opera-head-body-v1';
export const WORKSHOP_ASSETS = './assets/workshop-v1';
export const WORKSHOP_CANVAS = Object.freeze({ width: 1024, height: 1536 });
// Seat both head layers inside the collar, hiding the narrow source-art peg.
// Source pixels; the classroom rig uses quarter-size coordinates.
export const WORKSHOP_HEAD_OFFSET = Object.freeze({ x: 0, y: 24 });
export const WORKSHOP_PARTS = Object.freeze([
  ['01', '紫袍官生'], ['02', '红蓝武将'], ['03', '粉衣花旦'], ['04', '持琴书生'],
  ['05', '黑金老生'], ['06', '蓝白青衣'], ['07', '红黑刀马旦'], ['08', '绿袍贵妃']
].map(([id, name]) => Object.freeze({ id, name })));

const validId = value => typeof value === 'string' && WORKSHOP_PARTS.some(part => part.id === value);
function legacyId(value, fallback) {
  const index = value === null || value === undefined || value === '' ? Number(fallback) : Number(value);
  return Number.isInteger(index) && index >= 0 && index < 8 ? String(index + 1).padStart(2, '0') : '01';
}

export function normalizeComposition(value) {
  const record = value && typeof value === 'object' ? value : {};
  return {
    ...(typeof record.id === 'string' && record.id ? { id: record.id } : {}),
    ...(typeof record.createdAt === 'string' ? { createdAt: record.createdAt } : {}),
    headId: validId(record.headId) ? record.headId : legacyId(record.face, record.character),
    bodyId: validId(record.bodyId) ? record.bodyId : legacyId(record.costume, record.character),
    name: typeof record.name === 'string' ? record.name.slice(0, 16) : '',
    artVersion: WORKSHOP_ART_VERSION,
    assetPack: WORKSHOP_ASSET_PACK
  };
}

export const partName = id => WORKSHOP_PARTS.find(part => part.id === id)?.name || WORKSHOP_PARTS[0].name;
export function compositionSummary(value) {
  const { headId, bodyId } = normalizeComposition(value);
  return `${partName(headId)} · ${partName(bodyId)}`;
}
export function compositionImage(value) {
  const { headId, bodyId } = normalizeComposition(value);
  return `${WORKSHOP_ASSETS}/previews/h${headId}-b${bodyId}.png`;
}
export function compositionLayers(headId, bodyId) {
  if (!validId(headId) || !validId(bodyId)) throw new RangeError('未知的木偶头部或身体');
  return [
    `${WORKSHOP_ASSETS}/bodies/${bodyId}-base.png`,
    `${WORKSHOP_ASSETS}/heads/${headId}-back.png`,
    `${WORKSHOP_ASSETS}/bodies/${bodyId}-collar.png`,
    `${WORKSHOP_ASSETS}/heads/${headId}-front.png`
  ];
}

export function saveComposition(works, value, newId, now = new Date().toISOString()) {
  const draft = normalizeComposition(value);
  const index = draft.id ? works.findIndex(work => work?.id === draft.id) : -1;
  const work = {
    ...draft,
    id: index >= 0 ? draft.id : newId,
    name: draft.name.trim() || `${partName(draft.headId)} · 我的木偶`,
    createdAt: index >= 0 ? works[index].createdAt || now : now,
    updatedAt: now
  };
  return { work, works: index >= 0 ? works.map((old, i) => i === index ? work : old) : [...works, work] };
}

export function savedWorks(state) {
  return (Array.isArray(state?.works) ? state.works : []).filter(work => work && typeof work === 'object' && typeof work.id === 'string' && work.id);
}

// A draft is deliberately not a classroom selection. Viewing legacy works is read-only.
export function activeComposition(state) {
  const works = savedWorks(state);
  const selected = works.find(work => work.id === state?.activeWorkId) || works.reduce((latest, work) => {
    const timestamp = value => Date.parse(value.updatedAt || value.createdAt || '') || 0;
    return !latest || timestamp(work) >= timestamp(latest) ? work : latest;
  }, null);
  return selected ? normalizeComposition(selected) : { ...normalizeComposition(null), name: '练习木偶' };
}
